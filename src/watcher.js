'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Watch only the sessions tree. Polling in the host remains the recovery path
// for unavailable directories, unsupported filesystems and dropped events.
class SessionWatcher {
  constructor(onChange, onState, watch = fs.watch) {
    this.onChange = onChange; this.onState = onState; this.watch = watch;
    this.root = ''; this.handle = null; this.closed = false;
  }
  start(home) {
    if (this.closed) return;
    const root = path.join(home, 'sessions');
    if (this.root === root && this.handle) return;
    this.handle?.close(); this.handle = null; this.root = root;
    try {
      const handle = this.watch(root, { recursive: true, persistent: false }, (event, name) => {
        if (this.closed || this.handle !== handle) return;
        const relative = name == null ? '' : String(name);
        if (relative && !relative.endsWith('.jsonl') && event !== 'rename') return;
        this.onChange(relative ? path.resolve(root, relative) : '', event);
      });
      this.handle = handle;
      handle.on('error', () => {
        if (this.handle !== handle) return;
        handle.close(); this.handle = null; this.onState(false);
      });
      this.onState(true);
    } catch { this.onState(false); }
  }
  dispose() { this.closed = true; this.handle?.close(); this.handle = null; }
}
module.exports = { SessionWatcher };
