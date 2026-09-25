# Contributing

Bug reports, reproducible synthetic fixtures, documentation fixes and small focused pull requests are welcome. For larger features, open an issue describing the user need before implementation. English and Chinese reports are welcome.

## Development

Use Node.js 22+ and npm:

```sh
npm ci --ignore-scripts
npm test
npm run package:local
npm run check:package
npm run check:release
```

The package checker needs Python 3. `check:release` validates public identity and links, not Marketplace acceptance. No command above publishes or installs anything.

Optional UI checks: install Python Playwright (`python -m pip install playwright`) and Microsoft Edge, then run `python test/browser.py`. `python scripts/marketing.py` regenerates synthetic screenshots and the original icon. These run headlessly with GPU disabled and audio muted. Screenshot generation also needs Node in PATH.

`test/local-smoke.js` and `test/calibrate.js` are optional maintainer diagnostics against local logs/installed Codex assets. They are not run by `npm test` or CI; never upload their private inputs. Their compatibility depends on the local Codex version.

## Architecture

- `src/usage.js`: log discovery, conservative attribution and incremental parsing.
- `src/context.js`: recorded context calculation.
- `src/watcher.js`: filesystem notifications with recovery.
- `src/extension.js`: VS Code lifecycle, session selection and views.
- `src/hover.js`, `src/chart.js`: native Markdown/SVG snapshot.
- `media/`: dashboard UI; update existing DOM nodes instead of replacing the page.
- `test/`: synthetic parser, host-contract, watcher and optional browser checks.

## Pull requests

Explain the problem, behavior change and validation. Preserve privacy, malformed-log tolerance and explicit unknown states. Do not treat character shares as exact token attribution. Include focused regression coverage for behavioral changes. Keep runtime dependencies and permissions minimal; do not add experimental API requirements to the public build.

Never commit real transcripts, credentials, screenshots containing private paths, local toolchains or generated VSIX files. Do not automate global input or disturb another running application while testing. Release uploads are a separate maintainer action.

By contributing you agree that your contribution is provided under the repository's MIT license. See [support](SUPPORT.md) and [security reporting](SECURITY.md).

## Localization

Runtime language resolution and static UI strings live in `media/i18n.js`; dynamic copy uses explicit Chinese/English pairs. Manifest commands, view names and settings use `package.nls*.json`. Add both languages when changing copy, preserve user-provided text, and run `npm test` plus the optional browser checks. Regenerate `docs/screenshots/en/` and `docs/screenshots/zh-CN/` from synthetic data with `python scripts/marketing.py`; README images must match their document language.
