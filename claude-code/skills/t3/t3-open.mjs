#!/usr/bin/env node
// Opens the current Claude Code chat in the T3 Code desktop app.
// Imports it first if T3 doesn't have it yet, using T3's own importer.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, openSync, readSync, closeSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const HOME = homedir();
const T3 = join(HOME, '.local/bin/t3');
const T3_HOME = process.env.T3CODE_HOME || join(HOME, '.t3');
const fail = (msg) => { console.log(JSON.stringify({ ok: false, error: msg })); process.exit(1); };
const t3 = (args, opts = {}) => execFileSync(T3, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });

const sessionId = process.argv[2] || process.env.CLAUDE_CODE_SESSION_ID;
if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) fail('No Claude Code session id. Run this from inside a Claude Code session.');
if (!existsSync(T3)) fail('The t3 command is missing. In T3 Code, open Settings, About and install the t3 command.');

// Find the transcript and the folder the chat started in (T3 files the chat under that folder).
const configDirs = [process.env.CLAUDE_CONFIG_DIR, join(HOME, '.claude')].filter(Boolean);
let transcript = null;
let configDir = null;
for (const dir of configDirs) {
  const projects = join(dir, 'projects');
  if (!existsSync(projects)) continue;
  for (const p of readdirSync(projects)) {
    const f = join(projects, p, sessionId + '.jsonl');
    if (existsSync(f)) { transcript = f; configDir = dir; break; }
  }
  if (transcript) break;
}
if (!transcript) fail('Could not find this chat in ~/.claude/projects.');
const head = Buffer.alloc(256 * 1024);
const fd = openSync(transcript, 'r');
const n = readSync(fd, head, 0, head.length, 0);
closeSync(fd);
let cwd = null;
for (const line of head.subarray(0, n).toString('utf8').split('\n')) {
  try { const r = JSON.parse(line); if (typeof r.cwd === 'string') { cwd = r.cwd; break; } } catch {}
}
if (!cwd) fail('Could not read the folder this chat started in.');

// Code Mode chats (experimental) can't be resumed outside the terminal, so T3 would fail on the first message.
if (readFileSync(transcript, 'utf8').includes('Your two tools are `REPL`')) {
  fail('This chat uses Code Mode (experimental), which T3 Code can\'t continue yet. Keep it in the terminal. Chats started without CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1 can move.');
}
if (!existsSync(cwd)) fail('The folder this chat started in no longer exists: ' + cwd);

let runtime;
try { runtime = JSON.parse(readFileSync(join(T3_HOME, 'userdata/server-runtime.json'), 'utf8')); } catch { fail('T3 Code is not running. Open the T3 Code app and run /t3 again.'); }
try { process.kill(runtime.pid, 0); } catch { fail('T3 Code is not running. Open the T3 Code app and run /t3 again.'); }
const environmentId = readFileSync(join(T3_HOME, 'userdata/environment-id'), 'utf8').trim();
// Which T3 Claude provider reads this chat's config folder (default 'claudeAgent' reads ~/.claude).
const resolveHome = (p) => { const x = p.replace(/^~(?=\/|$)/, HOME); try { return realpathSync(x); } catch { return x; } };
let instanceId = null;
try {
  const settings = JSON.parse(readFileSync(join(T3_HOME, 'userdata/settings.json'), 'utf8'));
  for (const [id, inst] of Object.entries(settings.providerInstances ?? {})) {
    if (inst.driver === 'claudeAgent' && inst.enabled !== false && inst.config?.homePath && resolveHome(inst.config.homePath) === resolveHome(configDir)) instanceId = id;
  }
} catch {}
if (!instanceId) {
  if (resolveHome(configDir) === resolveHome(join(HOME, '.claude'))) instanceId = 'claudeAgent';
  else fail('T3 has no Claude provider for ' + configDir + '. In T3, open Settings, Providers, Add provider, pick Claude and set CLAUDE_CONFIG_DIR to that folder.');
}
const threadId = 'import:' + instanceId + ':' + sessionId;

const hasThread = () => { try { t3(['thread', 'show', threadId, '--json', '--messages', '1']); return true; } catch { return false; } };

// One RPC call over T3's local WebSocket, signed in with a short-lived token.
async function rpc(token, tag, payload) {
  const origin = runtime.origin;
  const H = { authorization: 'Bearer ' + token };
  let res = await fetch(origin + '/api/auth/websocket-ticket/rpc', { method: 'POST', headers: H });
  if (res.status === 404) res = await fetch(origin + '/api/auth/websocket-ticket', { method: 'POST', headers: H });
  if (!res.ok) throw new Error('T3 refused the sign-in (' + res.status + ').');
  const { ticket } = await res.json();
  const url = origin.replace(/^http/, 'ws') + '/ws?orchestrationProtocol=2&wsTicket=' + encodeURIComponent(ticket);
  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => { ws.close(); reject(new Error(tag + ' timed out.')); }, 120000);
    ws.onopen = () => ws.send(JSON.stringify({ _tag: 'Request', id: '1', tag, payload, headers: [] }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(String(e.data));
      if (msg._tag === 'Ping') { ws.send(JSON.stringify({ _tag: 'Pong' })); return; }
      if (msg._tag !== 'Exit' || msg.requestId !== '1') return;
      clearTimeout(timer); ws.close();
      if (msg.exit._tag === 'Success') resolve(msg.exit.value);
      else reject(new Error(tag + ' failed: ' + JSON.stringify(msg.exit.cause).slice(0, 400)));
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('Could not connect to T3 Code.')); };
  });
}

const same = (a, b) => { try { return realpathSync(a) === realpathSync(b); } catch { return a === b; } };

let imported = false;
let note = null;
if (!hasThread()) {
  const issued = JSON.parse(t3(['auth', 'session', 'issue', '--scope', 'orchestration:read', '--scope', 'orchestration:operate', '--ttl', '5m', '--label', 'claude /t3', '--json']));
  const token = issued.token ?? issued.accessToken;
  const tokenSession = issued.sessionId;
  let error = null;
  try {
    let scan = await rpc(token, 'agentSessions.scan', {});
    let project = scan.candidates.find((c) => same(c.path, cwd));
    if (!project?.projectId) {
      t3(['project', 'add', cwd]);
      scan = await rpc(token, 'agentSessions.scan', {});
      project = scan.candidates.find((c) => same(c.path, cwd));
    }
    if (!project?.projectId) throw new Error('T3 has no project for ' + cwd + '.');
    const result = await rpc(token, 'agentSessions.import', { projectId: project.projectId, expectedWorkspaceRoot: project.path });
    imported = true;
    note = 'Imported ' + result.importedCount + ' chat(s) from ' + cwd + '.';
  } catch (e) {
    error = e;
  }
  // Revoke before any exit, so no sign-in is left behind.
  if (tokenSession) { try { t3(['auth', 'session', 'revoke', tokenSession]); } catch {} }
  if (error) fail(error.stderr?.trim() || error.message);
  if (!hasThread()) fail('T3 imported the folder but not this chat. It may be older than 30 days or past T3\'s scan limit.');
}

const link = 't3code://threads/' + environmentId + '/' + encodeURIComponent(threadId);
execFileSync('open', [link]);
console.log(JSON.stringify({ ok: true, imported, alreadyInT3: !imported, note, folder: cwd, threadId, link }));