// Session-cleanup self-check: verifies used sessions are closed on shutdown, the keep/close-all
// overrides work, and an active QA recording is stopped first.
//
// Run from the repo root, with Pi's node_modules reachable (the extension imports Pi packages):
//   ln -sfn "$HOME/.pi/agent/install/releases/<version>/node_modules" node_modules
//   node test/cleanup.test.mjs
const root = new URL("../extensions/agentx-browser.ts", import.meta.url).pathname;

function mockPi(calls) {
  const tools = new Map();
  const hooks = new Map();
  return {
    tools,
    hooks,
    api: {
      registerTool: (t) => tools.set(t.name, t),
      registerCommand: () => {},
      on: (name, fn) => hooks.set(name, [...(hooks.get(name) ?? []), fn]),
      exec: async (cmd, args) => {
        calls.push(args.join(" "));
        return { code: 0, stdout: "", stderr: "" };
      },
      ui: { notify: () => {} },
    },
  };
}

async function boot(env = {}) {
  for (const k of ["AGENTX_BROWSER_KEEP_ON_SHUTDOWN", "AGENTX_BROWSER_CLOSE_ON_SHUTDOWN", "AGENT_BROWSER_IDLE_TIMEOUT_MS"]) {
    delete process.env[k];
  }
  Object.assign(process.env, env);
  const calls = [];
  const { api, tools, hooks } = mockPi(calls);
  const mod = await import(`${root}?v=${Math.random()}`);
  mod.default(api);
  return { calls, tools, hooks };
}

async function shutdown(hooks) {
  for (const fn of hooks.get("session_shutdown") ?? []) await fn();
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok - ${msg}`);
};

// 1. idle timeout default applied
{
  const { hooks } = await boot();
  assert(process.env.AGENT_BROWSER_IDLE_TIMEOUT_MS === "600000", "idle timeout defaults to 600000ms");
  await shutdown(hooks);
}

// 2. used sessions closed on exit, unused ones untouched
{
  const { calls, tools, hooks } = await boot();
  const run = tools.get("browser_run");
  await run.execute("1", { args: ["open", "https://example.com"], global: { session: "t1" } });
  await run.execute("2", { args: ["get", "title"] });
  calls.length = 0;
  await shutdown(hooks);
  assert(JSON.stringify(calls.slice().sort()) === JSON.stringify(["--session t1 close", "close"]), `closes used sessions only, got ${JSON.stringify(calls)}`);
}

// 3. keep-on-shutdown opt out
{
  const { calls, tools, hooks } = await boot({ AGENTX_BROWSER_KEEP_ON_SHUTDOWN: "1" });
  await tools.get("browser_run").execute("1", { args: ["open", "https://example.com"] });
  calls.length = 0;
  await shutdown(hooks);
  assert(calls.length === 0, "AGENTX_BROWSER_KEEP_ON_SHUTDOWN=1 leaves sessions alone");
}

// 4. close --all upgrade
{
  const { calls, tools, hooks } = await boot({ AGENTX_BROWSER_CLOSE_ON_SHUTDOWN: "1" });
  await tools.get("browser_run").execute("1", { args: ["open", "https://example.com"], global: { session: "t2" } });
  calls.length = 0;
  await shutdown(hooks);
  assert(calls.length === 1 && calls[0] === "close --all", "AGENTX_BROWSER_CLOSE_ON_SHUTDOWN=1 closes all");
}

// 5. active QA recording stopped before closing
{
  const { calls, tools, hooks } = await boot();
  await tools.get("browser_qa_record").execute("1", { action: "start", name: "check", outputDir: "/tmp" }, undefined, undefined, { cwd: "/tmp" });
  calls.length = 0;
  await shutdown(hooks);
  assert(calls.some((c) => c.startsWith("record stop")), "stops active QA recording on exit");
  assert(calls.at(-1) === "close" || calls.at(-1).endsWith("close"), "closes browser after stopping recording");
}

console.log("\nall checks passed");
