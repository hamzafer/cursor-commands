#!/usr/bin/env node
// Opens the current Claude Code chat in the T3 Code desktop app.
// Imports it first if T3 doesn't have it yet, using T3's own importer.
// Always prints exactly one JSON line: {"ok":true,...} or {"ok":false,"error":"..."}.
import { execFileSync } from 'node:child_process';
import { createReadStream, readFileSync, readdirSync, existsSync, realpathSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join, delimiter, dirname, basename } from 'node:path';

const HOME = homedir();
const T3_HOME = process.env.T3CODE_HOME || join(HOME, '.t3');

class Fail extends Error {}
const fail = (msg) => { throw new Fail(msg); };
const out = (value) => console.log(JSON.stringify(value));

const expand = (p) => p.replace(/^~(?=\/|$)/, HOME);
const real = (p) => { try { return realpathSync(expand(p)); } catch { return expand(p); } };
const same = (a, b) => real(a) === real(b);

function findT3() {
  const dirs = [process.env.T3CODE_INSTALL_BIN_DIR, ...(process.env.PATH || '').split(delimiter), join(HOME, '.local/bin')];
  for (const dir of dirs) {
    if (!dir) continue;
    const f = join(dir, 't3');
    try { if (statSync(f).isFile()) return f; } catch {}
  }
  return null;
}

// A Code Mode chat records its tool list (REPL and Poll) in its api-request-shape lines.
// Read line by line and look only at those records, so text quoted elsewhere in the chat doesn't count.
async function usesCodeMode(transcript) {
  const input = createReadStream(transcript, 'utf8');
  const lines = createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (!line.startsWith('{"type":"api-request-shape"')) continue;
      try {
        const names = (JSON.parse(line).shape?.tools ?? []).map((t) => t?.name);
        return names.includes('REPL') && names.includes('Poll');
      } catch { return false; }
    }
    return false;
  } finally {
    lines.close();
    input.destroy();
  }
}

// The T3 Claude provider whose config folder holds this chat, resolved the way T3's importer does:
// enabled claudeAgent instances, the default one first, the first instance for each folder wins.
function providerInstanceFor(configDir) {
  let instances = {};
  try { instances = JSON.parse(readFileSync(join(T3_HOME, 'userdata/settings.json'), 'utf8')).providerInstances ?? {}; } catch {}
  const enabled = (inst) => inst.enabled !== false && inst.config?.enabled !== false;
  const list = Object.entries(instances).filter(([, inst]) => inst.driver === 'claudeAgent' && enabled(inst));
  if (!Object.hasOwn(instances, 'claudeAgent')) list.push(['claudeAgent', { driver: 'claudeAgent' }]);
  list.sort(([a], [b]) => (a === 'claudeAgent' ? 0 : 1) - (b === 'claudeAgent' ? 0 : 1));
  const seen = new Set();
  for (const [id, inst] of list) {
    const fromEnv = inst.environment?.findLast?.((v) => v.name === 'CLAUDE_CONFIG_DIR')?.value;
    const home = real(inst.config?.homePath?.trim() || fromEnv?.trim() || join(HOME, '.claude'));
    if (seen.has(home)) continue;
    seen.add(home);
    if (home === real(configDir)) return id;
  }
  return null;
}

// T3 files a chat from a linked git worktree under the main checkout.
function mainCheckout(cwd) {
  try {
    const common = execFileSync('git', ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return basename(common) === '.git' ? dirname(common) : cwd;
  } catch { return cwd; }
}

// One RPC call over T3's local WebSocket, signed in with a short-lived token.
async function rpc(origin, token, tag, payload) {
  const headers = { authorization: 'Bearer ' + token };
  let res = await fetch(origin + '/api/auth/websocket-ticket/rpc', { method: 'POST', headers });
  if (res.status === 404) res = await fetch(origin + '/api/auth/websocket-ticket', { method: 'POST', headers });
  if (!res.ok) throw new Error('T3 refused the sign-in (' + res.status + ').');
  const { ticket } = await res.json();
  const url = origin.replace(/^http/, 'ws') + '/ws?orchestrationProtocol=2&wsTicket=' + encodeURIComponent(ticket);
  return await new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn, value) => { if (done) return; done = true; clearTimeout(timer); try { ws.close(); } catch {} fn(value); };
    const ws = new WebSocket(url);
    const timer = setTimeout(() => finish(reject, new Error(tag + ' timed out.')), 120000);
    ws.onopen = () => ws.send(JSON.stringify({ _tag: 'Request', id: '1', tag, payload, headers: [] }));
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(String(e.data)); } catch { return; }
      if (msg._tag === 'Ping') { ws.send(JSON.stringify({ _tag: 'Pong' })); return; }
      if (msg._tag !== 'Exit' || msg.requestId !== '1') return;
      if (msg.exit?._tag === 'Success') finish(resolve, msg.exit.value);
      else finish(reject, new Error(tag + ' failed: ' + JSON.stringify(msg.exit?.cause).slice(0, 400)));
    };
    ws.onerror = () => finish(reject, new Error('Could not connect to T3 Code.'));
    ws.onclose = () => finish(reject, new Error('T3 Code closed the connection before ' + tag + ' finished.'));
  });
}

async function main() {
  const sessionId = process.argv[2] || process.env.CLAUDE_CODE_SESSION_ID;
  if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) fail('No Claude Code session id. Run this from inside a Claude Code session.');
  const T3 = findT3();
  if (!T3) fail('The t3 command is missing. In T3 Code, open Settings, About and install the t3 command.');
  const t3 = (args) => execFileSync(T3, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  // Find the transcript and the folder the chat started in.
  const configDirs = [process.env.CLAUDE_CONFIG_DIR, join(HOME, '.claude')].filter(Boolean).map(expand);
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
  if (!transcript) fail('Could not find this chat in ' + configDirs.map((d) => join(d, 'projects')).join(' or ') + '.');

  let cwd = null;
  const input = createReadStream(transcript, 'utf8');
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.includes('"cwd"')) continue;
    try { const r = JSON.parse(line); if (typeof r.cwd === 'string') { cwd = r.cwd; break; } } catch {}
  }
  lines.close();
  input.destroy();
  if (!cwd) fail('Could not read the folder this chat started in.');

  // Code Mode chats (experimental) can only be resumed in the terminal, so T3 would fail on the first message.
  if (await usesCodeMode(transcript)) {
    fail('This chat uses Code Mode (experimental), which T3 Code can\'t continue yet. Keep it in the terminal. Chats started without CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1 can move.');
  }
  if (!existsSync(cwd)) fail('The folder this chat started in no longer exists: ' + cwd);

  let runtime;
  try { runtime = JSON.parse(readFileSync(join(T3_HOME, 'userdata/server-runtime.json'), 'utf8')); process.kill(runtime.pid, 0); }
  catch { fail('T3 Code is not running. Open the T3 Code app and run /t3 again.'); }
  let environmentId;
  try { environmentId = readFileSync(join(T3_HOME, 'userdata/environment-id'), 'utf8').trim(); }
  catch { fail('Could not read T3 Code\'s environment id. Open the T3 Code app once and run /t3 again.'); }

  const instanceId = providerInstanceFor(configDir);
  if (!instanceId) fail('T3 has no Claude provider for ' + configDir + '. In T3, open Settings, Providers, Add provider, pick Claude and set CLAUDE_CONFIG_DIR to that folder.');
  const threadId = 'import:' + instanceId + ':' + sessionId;
  const hasThread = () => { try { t3(['thread', 'show', threadId, '--json', '--messages', '1']); return true; } catch { return false; } };

  let imported = false;
  let note = null;
  if (!hasThread()) {
    let issued;
    try {
      issued = JSON.parse(t3(['auth', 'session', 'issue', '--scope', 'orchestration:read', '--scope', 'orchestration:operate', '--ttl', '5m', '--label', 'claude /t3', '--json']));
    } catch (e) {
      fail('Could not sign in to T3 Code: ' + (e.stderr?.trim() || e.message));
    }
    const projectRoot = mainCheckout(cwd);
    let addedProject = false;
    let error = null;
    try {
      const find = (scan) => scan.candidates.find((c) => same(c.path, projectRoot) || same(c.path, cwd));
      let project = find(await rpc(runtime.origin, issued.token, 'agentSessions.scan', {}));
      if (!project?.projectId) {
        t3(['project', 'add', projectRoot]);
        addedProject = true;
        project = find(await rpc(runtime.origin, issued.token, 'agentSessions.scan', {}));
      }
      if (!project?.projectId) throw new Error('T3 Code doesn\'t import chats from ' + cwd + '.');
      // From here T3 may have imported chats into the project even if the call fails, so keep it.
      addedProject = false;
      const result = await rpc(runtime.origin, issued.token, 'agentSessions.import', { projectId: project.projectId, expectedWorkspaceRoot: project.path });
      imported = true;
      note = 'Imported ' + result.importedCount + ' chat(s) from ' + project.path + '.';
    } catch (e) {
      error = e;
    }
    // Clean up before reporting: revoke the token, and undo a project we added for nothing.
    try { t3(['auth', 'session', 'revoke', issued.sessionId]); } catch {}
    if (addedProject) { try { t3(['project', 'remove', projectRoot]); } catch {} }
    if (error) fail(error.stderr?.trim() || error.message);
    if (!hasThread()) fail('T3 didn\'t import this chat. It skips chats older than 30 days and chats with no reply yet.');
  }

  const link = 't3code://threads/' + environmentId + '/' + encodeURIComponent(threadId);
  try { execFileSync('open', [link]); } catch { fail('Could not open T3 Code. Open this link yourself: ' + link); }
  out({ ok: true, imported, alreadyInT3: !imported, note, folder: cwd, threadId, link });
}

main().catch((e) => {
  out({ ok: false, error: e instanceof Fail ? e.message : 'Unexpected error: ' + (e?.message ?? String(e)) });
  process.exitCode = 1;
});
