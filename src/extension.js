'use strict';
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { SessionWatcher } = require('./watcher');
const { buildHover } = require('./hover');
const i18n = require('../media/i18n');
const { IncrementalReader, discover, metadata, codexHome } = require('./usage');

function activate(context) {
  let panel, sidebar, timer, busy = false, disposed = false, epoch = 0;
  let activeRefresh = null, checkedAt = null, watching = false, watchTimer, watchForce = false;
  let cardValue = '', pendingCard, cardTimer, publishedSample = false, refreshAgain = false, forceAgain = false;
  let sessions = [], inventory = null, lastScan = 0, reader = null, snapshot = null, error = '';
  let selectionNote = '';
  let chosen = context.workspaceState.get('selectedSession', '');
  const metadataCache = new Map();
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 95);
  status.name = 'Codex Context Lens'; status.command = 'codexContextLens.sidebar';
  status.text = '$(pulse) Codex Context Lens'; status.show();
  const cfg = () => vscode.workspace.getConfiguration('codexContextLens');
  const language = () => i18n.language(cfg().get('language', 'auto'), vscode.env.language);
  const t = (zh,en) => i18n.translator(language())(zh,en);
  const home = () => codexHome(cfg().get('codexHome', ''));
  const sameFolder = (a, b) => process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);
  function publish() {
    // Do not resend identical content or change the status-bar anchor.
    // Read timestamps belong in the panel; clock ticks must not rebuild a hover.
    const card = hoverCard();
    pendingCard = card;
    // Stable tooltips are whole-document snapshots. Bound redraws without
    // leaving the next hover permanently stale; never debounce indefinitely.
    if (!cardValue || (!publishedSample && snapshot)) flushCard();
    else if (cfg().get('autoRefreshHover', true) && card.value !== cardValue && !cardTimer) {
      cardTimer = setTimeout(() => { cardTimer = null; flushCard(); }, 5000);
    }
    for (const target of [panel, sidebar].filter(Boolean)) void target.webview.postMessage({ type: 'state', language: language(), snapshot, sessions: sessions.map(s => ({ file: s.file, title: s.fallbackTitle ? t('会话 ','Session ')+(s.id.slice(-8)||path.basename(s.file).slice(8,24)) : s.title, cwd: s.cwd, id: s.id })), selected: reader?.file || chosen, pinned: Boolean(chosen), error, home: home(), selectionNote, remote: vscode.env.remoteName || '', watching, inventory: inventory && { count: inventory.totalFiles, errors: inventory.errors, truncated: inventory.truncated }, checkedAt });
  }
  function flushCard() {
    clearTimeout(cardTimer); cardTimer = null;
    if (disposed) return;
    if (pendingCard && pendingCard.value !== cardValue) {
      cardValue = pendingCard.value; status.tooltip = pendingCard;
      publishedSample ||= Boolean(snapshot?.last && !snapshot?.catchingUp);
    }
  }
  function hoverCard() { return buildHover(vscode, { snapshot, chosen, error, watching, selectionNote, language: language(), autoRefreshHover: cfg().get('autoRefreshHover', true) }); }
  function refresh(force = false) {
    if (disposed) return Promise.resolve();
    if (activeRefresh) {
      refreshAgain = true; forceAgain ||= force;
      return activeRefresh;
    }
    activeRefresh = (async () => {
      try {
        do {
          refreshAgain = false; forceAgain = false;
          await runRefresh(force);
          force = forceAgain;
        } while (refreshAgain && !disposed);
      } finally { activeRefresh = null; }
    })();
    return activeRefresh;
  }
  const watcher = new SessionWatcher((file, event) => {
    if (disposed) return;
    const known = file && (metadataCache.get(file) || sessions.find(s => sameFolder(s.file, file)));
    if (known?.internal && (!chosen || !sameFolder(chosen, file))) return;
    const selected = reader?.file || chosen;
    if (chosen && file && !sameFolder(chosen, file) && event !== 'rename') return;
    watchForce ||= !file || event === 'rename' || !selected || !sameFolder(selected, file);
    // Fixed coalescing window: continuous output cannot postpone reads forever.
    if (!watchTimer) watchTimer = setTimeout(() => {
      watchTimer = null;
      const force = watchForce; watchForce = false;
      void refresh(force);
    }, 400);
  }, enabled => { watching = enabled; });
  publish();
  async function runRefresh(force = false) {
    if (busy || disposed) return;
    busy = true;
    const version = epoch;
    try {
      error = '';
      watcher.start(home());
      if (force || Date.now() - lastScan > 60000 || !inventory) {
        const discovered = await discover(home(), 30000);
        const limit = cfg().get('maxSessions', 80);
        const folders = vscode.workspace.workspaceFolders || [];
        let workspaceFound = !folders.length;
        const found = [];
        for (const item of discovered.files) {
          let meta = metadataCache.get(item.file);
          if (!meta || (meta.fallback && item.size !== meta.size)) {
            try { meta = { ...await metadata(item.file), size: item.size }; meta.fallback = !meta.id; metadataCache.set(item.file, meta); }
            catch { meta = { title: path.basename(item.file), cwd: '', id: '' }; }
          }
          if (meta.internal && item.file !== chosen) continue;
          const matches = meta.cwd && folders.some(f => sameFolder(meta.cwd, f.uri.fsPath));
          if (found.length < limit || matches && !workspaceFound || item.file === chosen) found.push({ ...meta, ...item });
          workspaceFound ||= Boolean(matches);
          if (found.length >= limit && workspaceFound) break;
        }
        if (version !== epoch) return;
        inventory = discovered; sessions = found; lastScan = Date.now();
        // Keep the cache bounded even after long use or changing CODEX_HOME.
        const live = new Set(discovered.files.map(s => s.file));
        for (const key of metadataCache.keys()) if (!live.has(key)) metadataCache.delete(key);
      }
      const folders = vscode.workspace.workspaceFolders || [];
      const match = sessions.find(s => !s.internal && s.cwd && folders.some(f => sameFolder(s.cwd, f.uri.fsPath)));
      const selected = chosen || match?.file || sessions.find(s => !s.internal)?.file;
      selectionNote = !chosen && !match && folders.length && selected ? t('当前项目暂无匹配会话，展示最近主会话（来源见下方目录）', 'No workspace match; showing the latest main session (source below)') : '';
      if (!selected) {
        reader = null; snapshot = null;
        if (inventory?.errors.length) error = t(`无法完整读取会话目录：${inventory.errors[0]}`, `Could not fully read the sessions directory: ${inventory.errors[0]}`);
        else if (sessions.length) error = t('未找到当前工作区的近期会话，请手动选择；也可以在设置中增加会话数量。', 'No recent workspace session. Select one manually or increase the session limit.');
        else error = t('未发现本地会话。确认 Codex 主目录，并在 Codex 中完成一次对话。', 'No local sessions found. Check Codex home and whether Codex has written a conversation log.');
      } else {
        if (!reader || reader.file !== selected) reader = new IncrementalReader(selected);
        const result = await reader.update();
        if (version !== epoch) return;
        snapshot = result;
        checkedAt = new Date().toISOString();
      }
    } catch (e) {
      error = t(`读取失败（${e.code || '错误'}）：${e.message}`, `Read failed(${e.code || 'Error'}):${e.message}`);
      // Retain the last sample with an explicit failure banner and its timestamp.
    } finally {
      busy = false;
      if (!disposed) {
        if (version === epoch) publish();
        clearTimeout(timer);
        timer = setTimeout(() => void refresh(), version !== epoch ? 50 : snapshot?.catchingUp ? 250 : Math.max(5, cfg().get('refreshSeconds', 15)) * 1000);
      }
    }
  }
  async function select(file) {
    // Incoming webview messages may only select already discovered files.
    if (file && !sessions.some(s => s.file === file)) return;
    chosen = file || ''; epoch++; reader = null; snapshot = null;
    await context.workspaceState.update('selectedSession', chosen);
    await refresh(); flushCard();
  }
  async function picker() {
    await refresh(true);
    const items = [{ label: t('$(sync) 自动：工作区最近会话', '$(sync) Auto: Latest workspace session'), file: '' }, ...sessions.map(s => ({ label: s.fallbackTitle ? t('会话 ','Session ')+(s.id.slice(-8)||path.basename(s.file).slice(8,24)) : s.title, description: s.id.slice(-8), detail: s.cwd || s.file, file: s.file }))];
    const picked = await vscode.window.showQuickPick(items, { title: t('选择并固定 Codex 会话', 'Select and pin a Codex session'), matchOnDetail: true, placeHolder: t('固定后不会因为其他聊天活动而跳动', 'Pinned sessions stay selected while other chats are active') });
    if (picked) await select(picked.file);
  }
  async function open() {
    if (panel) { panel.reveal(); publish(); return; }
    panel = vscode.window.createWebviewPanel('codexContextLens', t('Codex Context Lens · 用量透镜', 'Codex Context Lens · Usage dashboard'), vscode.ViewColumn.Beside, { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')] });
    await setupView(panel, false);
  }
  async function setupView(current, isSidebar) {
    const webview = current.webview;
    webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')] };
    const nonce = crypto.randomBytes(18).toString('hex');
    const template = await fs.readFile(path.join(context.extensionPath, 'media', 'dashboard.html'), 'utf8');
    if ((isSidebar ? sidebar : panel) !== current) return;
    current.onDidDispose(() => { if (isSidebar) { if (sidebar === current) sidebar = null; } else if (panel === current) panel = null; });
    const visible = () => { if (current.visible) { publish(); void refresh(); } };
    if (isSidebar) current.onDidChangeVisibility(visible); else current.onDidChangeViewState(visible);
    current.webview.onDidReceiveMessage(async message => {
      if (!message || typeof message.type !== 'string') return;
      if (message.type === 'ready') { publish(); await refresh(); }
      else if (message.type === 'refresh') await refresh(true);
      else if (message.type === 'select' && typeof message.file === 'string') await select(message.file);
      else if (message.type === 'picker') await picker();
      else if (message.type === 'settings') await vscode.commands.executeCommand('workbench.action.openSettings', 'codexContextLens');
    });
    // Register the ready handler before the page can execute its startup script.
    webview.html = i18n.html(template,language()).replaceAll('{{CSP}}', webview.cspSource).replaceAll('{{NONCE}}', nonce)
      .replaceAll('{{CSS}}', webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'dashboard.css')).toString())
      .replaceAll('{{I18N}}', webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'i18n.js')).toString())
      .replaceAll('{{JS}}', webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'dashboard.js')).toString());
    publish();

  }
  context.subscriptions.push(status,
    vscode.commands.registerCommand('codexContextLens.open', open),
    vscode.commands.registerCommand('codexContextLens.select', picker),
    vscode.commands.registerCommand('codexContextLens.refresh', async () => { await refresh(true); flushCard(); }),
    vscode.commands.registerCommand('codexContextLens.sidebar', () => vscode.commands.executeCommand('codexContextLens.live.focus')),
    vscode.window.registerWebviewViewProvider('codexContextLens.live', { async resolveWebviewView(view) { sidebar = view; await setupView(view, true); await refresh(true); } }),
    vscode.commands.registerCommand('codexContextLens.settings', () => vscode.commands.executeCommand('workbench.action.openSettings', 'codexContextLens')),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (!e.affectsConfiguration('codexContextLens')) return;
      if (e.affectsConfiguration('codexContextLens.language') && !['codexHome','maxSessions','refreshSeconds'].some(key=>e.affectsConfiguration('codexContextLens.'+key))) {
        if(panel)panel.title=t('Codex Context Lens · 用量透镜','Codex Context Lens · Usage dashboard');
        void refresh().then(flushCard); return;
      }
      clearTimeout(watchTimer); watchTimer = null; watchForce = false;
      clearTimeout(cardTimer); cardTimer = null; publishedSample = false;
      epoch++; lastScan = 0; inventory = null; reader = null; snapshot = null; metadataCache.clear();
      chosen = ''; void context.workspaceState.update('selectedSession', ''); void refresh(true);
    }),
    vscode.window.onDidChangeActiveColorTheme(() => { publish(); flushCard(); }),
    { dispose() { disposed = true; clearTimeout(timer); clearTimeout(watchTimer); clearTimeout(cardTimer); watcher.dispose(); panel?.dispose(); } }
  );
  void refresh(true);
}
function format(n) { return n == null ? '—' : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n); }
module.exports = { activate };
