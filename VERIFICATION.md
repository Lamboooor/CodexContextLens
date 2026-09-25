# Validation scope

## Public preview 0.6.0

This release changes product identity, packaging and documentation. Runtime behavior is inherited from 0.5.2.

The local Windows checks cover 15 synthetic parser/dashboard cases, Markdown escaping, a mocked VS Code host, and actual temporary-directory filesystem notifications. The optional headless Edge regression preserves the main container, numeric text, category nodes and focus through 30 updates. Package inspection checks archive integrity, allowed files, manifest flags and limited secret/path patterns; it is not an exhaustive security audit.

The maintainer accepted the current preview experience with the native-hover redraw limitation disclosed. A fresh interactive install of the new public identity has not yet been verified. Linux, macOS and remote hosts remain unverified. CI currently repeats the synthetic and packaging checks on Windows.

All product screenshots are generated from synthetic data. No actual logs or private screenshots are published. Tests do not move the system pointer, inject global input or open foreground UI.

## Reproduce

```sh
npm ci --ignore-scripts
npm test
npm run package:local
npm run check:package
npm run check:release
```

The package checker needs Python 3. Optional browser tests require Playwright and Edge; see CONTRIBUTING.md. A passing release check validates metadata, not Marketplace ownership, review or publication.

## Metric calibration

An earlier local comparison of 94 recorded snapshots and 48 boundary combinations matched the inspected official context indicator formula. This applies to the particular locally inspected Codex version and does not guarantee future log/API compatibility. Private inputs are not published. See ACCURACY.md for the formula and measurement boundaries.

## Bilingual preview 0.7.0

Language resolution, full static-template translation, chart/hover labels and manifest translation-key completeness pass automated checks. Host tests cover live language changes preserving a pinned session. Headless Edge checks English copy without untranslated Chinese, Chinese labels, user text preservation, focus/node stability and both language screenshot sets. SVG label bounds are checked and both full dashboard layouts plus the English narrow sidebar and hover were visually reviewed. No foreground/native mouse automation was performed.

## 0.7.1 publication identity correction

Marketplace rejected the earlier package name. An alternative unpublished candidate was prepared and checked. No runtime logic changed.

## 0.8.0 complete product rename

Public name searches found no exact existing Marketplace or GitHub match for Codex Context Lens at preparation time. This does not reserve the name or guarantee Marketplace acceptance. Current-source branding, command/configuration identifiers, docs, package metadata and bilingual screenshot generation are updated together. Earlier Git commits are preserved as history.
