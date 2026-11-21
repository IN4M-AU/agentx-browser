# agentx-browser

Robust Pi package for [`agent-browser`](https://github.com/vercel-labs/agent-browser).

Purpose: replace fragile one-string wrapper with structured Pi tools that use exact argv arrays, batch mode, screenshot handling, truncation, and upstream agent-browser skills.

## Quick Start

1. Install dependencies:

```bash
npm install -g agent-browser
agent-browser install
winget install Gyan.FFmpeg
```

2. Install package in Pi:

```bash
pi install git:github.com/michael-poole-softlink/agentx-browser
```

3. Reload Pi:

```bash
/reload
```

4. Use it:

```bash
/qa-browser https://example.com
/skill:agentx-browser-qa
```

## Requirements

Install these first:

1. `agent-browser`
   - required for all browser automation tools in this package
2. `ffmpeg`
   - required only if you want QA video transcoding to MP4 or GIF
   - raw WebM recording still works without ffmpeg

Example install:

```bash
npm install -g agent-browser
agent-browser install
```

Windows ffmpeg example:

```bash
winget install Gyan.FFmpeg
```

Make sure both `agent-browser` and `ffmpeg` are available on `PATH` before using this package.

Optional:

```bash
agent-browser doctor
```

Use `agent-browser doctor` only if install seems broken or you want to verify the local `agent-browser` setup.

## What package adds

- `browser_run` — run any `agent-browser` command via exact argv array.
- `browser_batch` — run multiple commands through `agent-browser batch` with JSON argv arrays.
- `browser_snapshot` — shortcut for accessibility snapshots, default `-i`.
- `browser_screenshot` — screenshot to temp/user path, optional inline image.
- `browser_skill` — read version-matched built-in agent-browser skills.
- `browser_qa_record` — start/stop QA evidence recording and optionally transcode WebM to MP4/GIF with ffmpeg.
- `/agentx-browser-doctor` — quick version/path check.
- `agentx-browser` skill — general browser automation guidance.
- `agentx-browser-qa` skill — QA workflow guidance with recording/evidence defaults.
- `/qa-browser <url-or-task>` prompt template — quick QA kickoff.

No `browser` tool registered. Avoids conflict with old `pi-agent-browser` package.

## Install in Pi

Install from GitHub:

```bash
pi install git:github.com/michael-poole-softlink/agentx-browser
```

Or try one run only without installing permanently:

```bash
pi -e git:github.com/michael-poole-softlink/agentx-browser
```

Local path install still works for development:

```bash
pi install /absolute/path/to/agentx-browser
```

Force-load skills manually if wanted:

```bash
/skill:agentx-browser
/skill:agentx-browser-qa
```

Quick QA kickoff:

```bash
/qa-browser https://example.com
/qa-browser checkout flow on staging; login with existing session and record evidence
```

Can run alongside old `pi-agent-browser` because this package uses unique tool names (`browser_run`, `browser_snapshot`, etc.).

## Session cleanup

Browsers do not outlive their work:

- **On Pi exit**, every session this Pi run opened is closed automatically. `AGENTX_BROWSER_KEEP_ON_SHUTDOWN=1` keeps them (e.g. to inspect a headed browser afterwards). An active QA recording is stopped first so no recorder is left running.
- **If Pi is killed** and the exit hook cannot run, the daemon self-shuts down after 10 minutes idle (upstream default is 1 hour). Override with `AGENT_BROWSER_IDLE_TIMEOUT_MS` (raw ms, `0` disables), or set `AGENTX_BROWSER_IDLE_TIMEOUT_MS=0` to leave upstream's default alone.
- **Other sessions are never touched.** Only sessions this run actually used are closed, so a second Pi session or a browser you started by hand keeps running. `AGENTX_BROWSER_CLOSE_ON_SHUTDOWN=1` upgrades this to `close --all`.

Check what is alive with `agent-browser session list` or the `/agentx-browser-doctor` command.

## Examples

Open and snapshot:

```json
{
  "args": ["open", "https://example.com"]
}
```

```json
{
  "interactive": true
}
```

Click/fill with refs:

```json
{
  "args": ["click", "@e1"]
}
```

```json
{
  "args": ["fill", "@e2", "hello@example.com"]
}
```

Batch setup:

```json
{
  "commands": [
    ["open"],
    ["network", "route", "*", "--abort", "--resource-type", "script"],
    ["open", "http://localhost:3000"],
    ["snapshot", "-i"]
  ],
  "bail": true
}
```

Persistent session:

```json
{
  "args": ["open", "https://app.example.com"],
  "global": {
    "session": "app-debug",
    "sessionName": "app-auth"
  }
}
```

Screenshot:

```json
{
  "full": true,
  "inline": true
}
```

QA recording with ffmpeg MP4 transcode:

```json
{
  "action": "start",
  "name": "login-regression",
  "outputDir": "qa-recordings"
}
```

Run browser QA steps, then:

```json
{
  "action": "stop",
  "transcode": "mp4"
}
```

Requires `ffmpeg` on PATH only when `transcode` is `mp4`, `gif`, or `both`. Raw WebM always comes from `agent-browser record`.

## Why better than old wrapper

Old wrapper problems:

- splits command string on whitespace, breaking quoted values and JSON args;
- returns `isError` instead of throwing, so Pi may not mark failed tools correctly;
- auto-closes the browser on every shutdown, including sessions it never opened;
- screenshot path extraction depends on stdout wording;
- minimal global flag support;
- no batch-first workflow.

This package fixes those by using structured argv arrays, throwing on failures, creating screenshot paths explicitly, supporting core global flags, exposing upstream skill docs, avoiding `browser` tool-name conflict, and closing only the sessions the current run opened.

## IN4M fork

Fork of `michael-poole-softlink/agentx-browser`, maintained at `IN4M-AU/agentx-browser`. Local changes: no-stale-session cleanup (see [Session cleanup](#session-cleanup)) — sessions opened by a run are closed on Pi exit, the daemon idle timeout is dropped to 10 minutes, and active QA recordings are stopped on exit.

Install this fork:

```bash
pi install git:github.com/IN4M-AU/agentx-browser
```
