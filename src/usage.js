'use strict';

const fs = require('node:fs/promises');
const { contextUsage } = require('./context');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const CATEGORIES = {
  history: '历史对话 / 压缩摘要', prompt: '本轮用户消息',
  files: '明确的文件读取结果', tools: '其他工具结果 / 混合输出',
  instructions: '可见系统与开发者指令', assistant: '本轮助手文本',
  reasoning: '可见推理摘要', calls: '工具调用参数'
};
const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const input = numeric(raw.input_tokens ?? raw.inputTokens);
  const output = numeric(raw.output_tokens ?? raw.outputTokens);
  if (input === null || output === null) return null;
  return {
    input, output,
    cached: numeric(raw.cached_input_tokens ?? raw.cachedInputTokens),
    reasoning: numeric(raw.reasoning_output_tokens ?? raw.reasoningOutputTokens),
    total: numeric(raw.total_tokens ?? raw.totalTokens) ?? input + output
  };
}
function plainText(value) {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value.map(x => typeof x === 'string' ? x : (x?.text ?? x?.content ?? '')).filter(x => typeof x === 'string' && x.length > 0).join('\n');
}
function safeTitle(text) {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70);
}
function emptyParts() { return Object.fromEntries(Object.keys(CATEGORIES).map(k => [k, 0])); }

class UsageAccumulator {
  constructor() {
    this.id = ''; this.cwd = ''; this.title = ''; this.model = '';
    this.window = null; this.last = null; this.total = null; this.usageAt = null;
    this.rateLimits = null; this.quotaAt = null;
    this.parts = emptyParts(); this.calls = new Map();
    this.rawRows = []; this.snapshotRows = []; this.seen = new Set();
    this.compactions = 0; this.turnId = ''; this.lines = 0; this.errors = 0;
    this.rawCount = 0; this.snapshotCount = 0; this.lastSnapshotKey = '';
    this.contextAfterCompaction = false;
    this.userEvents = new Map(); this.userResponses = new Map();
  }
  addPart(key, text) {
    // UTF-16 text units, NOT tokens. No raw message bodies retained in state.
    if (typeof text === 'string' && text) this.parts[key] += text.length;
  }
  userText(source, text) {
    if (!text) return;
    const key = crypto.createHash('sha256').update(text).digest('hex');
    const own = source === 'event' ? this.userEvents : this.userResponses;
    const other = source === 'event' ? this.userResponses : this.userEvents;
    if (other.get(key)) {
      const left = other.get(key) - 1;
      if (left) other.set(key, left); else other.delete(key);
    } else {
      this.addPart('prompt', text);
      own.set(key, (own.get(key) || 0) + 1);
      if (own.size > 500) own.delete(own.keys().next().value);
    }
  }
  startTurn(id) {
    if (id && id === this.turnId) return;
    this.parts.history += this.parts.prompt + this.parts.assistant;
    this.parts.prompt = 0; this.parts.assistant = 0;
    this.turnId = id || `turn-${this.lines}`;
    this.userEvents.clear(); this.userResponses.clear();
  }
  usage(raw, total, timestamp) {
    const last = normalize(raw), sum = normalize(total);
    if (last) { this.last = last; this.usageAt = timestamp; this.contextAfterCompaction = false; }
    if (sum) this.total = sum;
    return last;
  }
  appendRow(list, row) { list.push(row); if (list.length > 160) list.shift(); }
  feed(line) {
    if (!line.trim()) return;
    this.lines++;
    let e;
    try { e = JSON.parse(line); } catch { this.errors++; return; }
    if (!e || typeof e !== 'object' || Array.isArray(e)) { this.errors++; return; }
    const p = e.payload && typeof e.payload === 'object' ? e.payload : {}, at = e.timestamp || null;
    if (e.type === 'session_meta') {
      this.id = p.id || p.session_id || this.id; this.cwd = p.cwd || this.cwd;
      this.window = numeric(p.context_window) || this.window;
      this.addPart('instructions', plainText(p.base_instructions?.text || p.base_instructions));
    } else if (e.type === 'turn_context') {
      this.model = p.model || this.model; this.cwd = p.cwd || this.cwd;
      this.startTurn(p.turn_id);
    } else if (e.type === 'token_usage_record') {
      const key = p.response_id || `${p.turn_id}:${JSON.stringify(p.thread_token_usage)}:${JSON.stringify(p.usage)}`;
      if (this.seen.has(key)) return;
      this.seen.add(key);
      if (this.seen.size > 10000) this.seen.delete(this.seen.values().next().value);
      const last = this.usage(p.usage, p.thread_token_usage, at);
      if (last) {
        this.rawCount++;
        this.appendRow(this.rawRows, { at, turn: p.turn_id || this.turnId, ...last });
      }
    } else if (e.type === 'event_msg' && p.type === 'token_count') {
      if (p.rate_limits) { this.rateLimits = p.rate_limits; this.quotaAt = at; }
      if (numeric(p.info?.model_context_window)) this.window = p.info.model_context_window;
      if (!p.info) return;
      const snapshotKey = JSON.stringify([p.info.total_token_usage, p.info.last_token_usage]);
      if (snapshotKey === this.lastSnapshotKey) return;
      this.lastSnapshotKey = snapshotKey;
      const last = this.usage(p.info.last_token_usage, p.info.total_token_usage, at);
      if (last) {
        this.snapshotCount++;
        this.appendRow(this.snapshotRows, { at, turn: this.turnId, ...last });
      }
    } else if (e.type === 'event_msg' && p.type === 'task_started') {
      this.startTurn(p.turn_id);
      if (numeric(p.model_context_window)) this.window = p.model_context_window;
    } else if (e.type === 'event_msg' && p.type === 'user_message') {
      if (!this.title) this.title = safeTitle(p.message || '');
      this.userText('event', typeof p.message === 'string' ? p.message : '');
    } else if (e.type === 'compacted') {
      this.parts = emptyParts(); this.calls.clear(); this.userEvents.clear(); this.userResponses.clear(); this.compactions++;
      this.contextAfterCompaction = true;
      this.addPart('history', plainText(p.message));
    } else if (e.type === 'response_item') {
      if (p.type === 'message') {
        const text = plainText(p.content);
        if (p.role === 'user') {
          this.userText('response', text);
        } else if (p.role === 'assistant') this.addPart('assistant', text);
        else if (p.role === 'system' || p.role === 'developer') this.addPart('instructions', text);
      } else if (p.type === 'function_call' || p.type === 'custom_tool_call') {
        let command = '', args;
        try { args = JSON.parse(p.arguments || '{}'); } catch { args = {}; }
        command = args.command || args.cmd || '';
        // Conservatively classify only explicit read tools or a single simple
        // read command. Orchestrated/mixed exec output remains "other tools".
        const readTool = /^(read_file|read_text_file|read_multiple_files|view_file)$/.test(p.name || '');
        const simpleRead = /^(Get-Content\s|cat\s|head\s|tail\s)/i.test(command.trim()) && !/[;|&\n]/.test(command);
        this.calls.set(p.call_id, readTool || simpleRead ? 'files' : 'tools');
        if (this.calls.size > 2000) this.calls.delete(this.calls.keys().next().value);
        this.addPart('calls', p.arguments || p.input || '');
      } else if (p.type === 'function_call_output' || p.type === 'custom_tool_call_output') {
        this.addPart(this.calls.get(p.call_id) || 'tools', plainText(p.output));
        this.calls.delete(p.call_id);
      } else if (p.type === 'reasoning') this.addPart('reasoning', plainText(p.summary));
    }
  }
  snapshot() {
    const parts = { ...this.parts };
    const visibleUnits = Object.values(parts).reduce((a, b) => a + b, 0);
    const context = contextUsage(this.contextAfterCompaction ? null : this.last?.total, this.window);
    return {
      id: this.id, cwd: this.cwd, title: this.title, model: this.model,
      window: this.window, last: this.last, total: this.total, usageAt: this.usageAt,
      contextPercent: context.percent, contextUsed: context.usedTokens, contextRemaining: context.remainingTokens,
      contextAfterCompaction: this.contextAfterCompaction,
      rateLimits: this.rateLimits, quotaAt: this.quotaAt,
      parts: Object.entries(parts).map(([key, units]) => ({ key, label: CATEGORIES[key], units, percent: visibleUnits ? units / visibleUnits * 100 : 0 })),
      visibleUnits, compactions: this.compactions, lines: this.lines, errors: this.errors,
      rows: this.rawRows.length ? this.rawRows : this.snapshotRows,
      rowKind: this.rawRows.length ? 'request' : 'snapshot',
      requestCount: this.rawRows.length ? this.rawCount : this.snapshotCount
    };
  }
}

class IncrementalReader {
  constructor(file) { this.file = file; this.reset(); }
  reset() { this.offset = 0; this.pending = Buffer.alloc(0); this.acc = new UsageAccumulator(); this.identity = null; this.modified = null; this.skipping = false; }
  async update(budget = 8 * 1024 * 1024) {
    const stat = await fs.stat(this.file);
    const identity = `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
    if (this.identity !== null && (identity !== this.identity || stat.size < this.offset || (stat.size === this.offset && this.modified !== stat.mtimeMs))) this.reset();
    this.identity = identity; this.modified = stat.mtimeMs;
    const length = Math.min(Math.max(0, stat.size - this.offset), budget);
    if (length) {
      const file = await fs.open(this.file, 'r');
      try {
        const data = Buffer.alloc(length);
        const { bytesRead } = await file.read(data, 0, length, this.offset);
        this.offset += bytesRead;
        const chunk = Buffer.concat([this.pending, data.subarray(0, bytesRead)]);
        let start = 0, end, processed = 0;
        while ((end = chunk.indexOf(10, start)) >= 0) {
          if (this.skipping) this.skipping = false;
          else if (end - start > 16 * 1024 * 1024) this.acc.errors++;
          else this.acc.feed(chunk.subarray(start, end).toString('utf8'));
          start = end + 1;
          if (++processed % 250 === 0) await new Promise(resolve => setImmediate(resolve));
        }
        this.pending = Buffer.from(chunk.subarray(start));
        if (this.pending.length > 16 * 1024 * 1024) { this.pending = Buffer.alloc(0); this.skipping = true; this.acc.errors++; }
      } finally { await file.close(); }
    }
    return { ...this.acc.snapshot(), file: this.file, bytesRead: this.offset, fileSize: stat.size, catchingUp: this.offset < stat.size, pendingLine: this.pending.length > 0 };
  }
}

function codexHome(setting) {
  const value = setting || process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  return path.resolve(value.replace(/^~(?=$|[\\/])/, os.homedir()));
}
async function discover(home, max = 80) {
  const root = path.join(home, 'sessions'), files = [], errors = [];
  let inspected = 0;
  async function walk(dir, depth) {
    if (depth > 4 || inspected > 30000) return;
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch (e) { errors.push(`${e.code || 'IO'}: ${dir}`); return; }
    for (const entry of entries) {
      if (++inspected > 30000) break;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        try { const stat = await fs.stat(full); files.push({ file: full, modified: stat.mtimeMs, size: stat.size }); }
        catch (e) { errors.push(`${e.code}: ${entry.name}`); }
      }
    }
  }
  await walk(root, 0);
  files.sort((a, b) => b.modified - a.modified);
  return { files: files.slice(0, max), totalFiles: files.length, errors, truncated: inspected > 30000 };
}
async function metadata(file) {
  const handle = await fs.open(file, 'r');
  try {
    const data = Buffer.alloc(128 * 1024);
    const { bytesRead } = await handle.read(data, 0, data.length, 0);
    const text = data.subarray(0, bytesRead).toString('utf8');
    let id = '', cwd = '', title = '', internal = false;
    for (const line of text.split('\n')) {
      try {
        const e = JSON.parse(line), p = e.payload || {};
        if (e.type === 'session_meta') { id = p.id || p.session_id || ''; cwd = p.cwd || ''; internal = Boolean(p.source && typeof p.source === 'object' && p.source.subagent); }
        if (e.type === 'event_msg' && p.type === 'user_message' && !title) title = safeTitle(p.message || '');
      } catch { /* prefix can end in an incomplete line */ }
    }
    return { id, cwd, internal, title: title || `会话 ${id.slice(-8) || path.basename(file).slice(8, 24)}` };
  } finally { await handle.close(); }
}
module.exports = { UsageAccumulator, IncrementalReader, normalize, discover, metadata, codexHome, CATEGORIES };
