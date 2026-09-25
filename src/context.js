'use strict';
// Matches the installed Codex context indicator, using the last usage snapshot.
function contextUsage(total, window) {
  if (!Number.isFinite(total) || total < 0 || !Number.isFinite(window) || window <= 0)
    return { percent: null, usedTokens: null, contextWindow: null, remainingTokens: null };
  const usedTokens = Math.min(total, window);
  return { percent: usedTokens / window * 100, usedTokens, contextWindow: window, remainingTokens: Math.max(window - usedTokens, 0) };
}
module.exports = { contextUsage };
