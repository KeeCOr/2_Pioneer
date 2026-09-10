'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const APP_PATH = path.resolve(__dirname, '..', 'src', 'App.jsx');
const CSS_PATH = path.resolve(__dirname, '..', 'src', 'index.css');
const BUILDER_PATH = path.resolve(__dirname, '..', 'electron-builder.config.cjs');
const PACKAGE_JSON_PATH = path.resolve(__dirname, '..', 'package.json');
const ELECTRON_MAIN_PATH = path.resolve(__dirname, '..', 'electron', 'main.cjs');

const appSource = fs.readFileSync(APP_PATH, { encoding: 'utf8' });
const cssSource = fs.readFileSync(CSS_PATH, { encoding: 'utf8' });
const builderSource = fs.readFileSync(BUILDER_PATH, { encoding: 'utf8' });

// Isolate the map-event marker renderer (between the "④ 항해 이벤트" and
// "⑤ 배" section comments) so assertions cannot accidentally match the
// unrelated port-nameplate label block earlier in the file.
const EVENT_SECTION_START = '④ 항해 이벤트';
const EVENT_SECTION_END = '⑤ 배';
const startIdx = appSource.indexOf(EVENT_SECTION_START);
const endIdx = appSource.indexOf(EVENT_SECTION_END, startIdx);
assert.ok(startIdx !== -1, 'expected to find the map-event renderer section comment in src/App.jsx');
assert.ok(endIdx !== -1 && endIdx > startIdx, 'expected to find the ship renderer section comment after the event renderer in src/App.jsx');
const eventSection = appSource.slice(startIdx, endIdx);

test('event label is anchored below its icon via top-full/left-1/2/-translate-x-1/2', () => {
  assert.match(
    eventSection,
    /className=\{`[^`]*\babsolute\b[^`]*\btop-full\b[^`]*\bleft-1\/2\b[^`]*-translate-x-1\/2[^`]*`\}/,
    'event label wrapper must combine "absolute top-full left-1/2 -translate-x-1/2" so label height never shifts the marker coordinate'
  );
});

test('event label no longer uses fixed 0.45rem font or whitespace-nowrap, and wraps within a viewport-safe width', () => {
  assert.doesNotMatch(
    eventSection,
    /whitespace-nowrap/,
    'event label must not force whitespace-nowrap (it should be allowed to wrap)'
  );
  assert.doesNotMatch(
    eventSection,
    /fontSize\s*:\s*['"]0\.45rem['"]/,
    'event label must not hardcode fontSize: \'0.45rem\''
  );

  const fontSizeMatch = eventSection.match(/fontSize\s*:\s*['"]clamp\(\s*([\d.]+)rem/);
  assert.ok(fontSizeMatch, 'event label must use a responsive clamp() fontSize with an explicit rem floor');
  const minRem = parseFloat(fontSizeMatch[1]);
  assert.ok(minRem >= 0.7, `event label minimum font size must be at least 0.7rem, got ${minRem}rem`);

  const lineHeightMatch = eventSection.match(/lineHeight\s*:\s*['"]?([\d.]+)/);
  assert.ok(lineHeightMatch, 'event label must set a compact lineHeight');
  const lineHeight = parseFloat(lineHeightMatch[1]);
  assert.ok(lineHeight > 0 && lineHeight <= 1.3, `event label lineHeight should be compact (<=1.3), got ${lineHeight}`);

  assert.match(
    eventSection,
    /maxWidth\s*:\s*['"]min\([^)]*vw[^)]*\)['"]/,
    'event label must cap width with a viewport-safe min(..., NNvw) maxWidth'
  );

  const allowsWrapping = /overflow-wrap\s*:\s*['"]anywhere['"]/.test(eventSection)
    || /whiteSpace\s*:\s*['"]normal['"]/.test(eventSection);
  assert.ok(allowsWrapping, 'event label must allow wrapping via overflow-wrap: anywhere or whiteSpace: normal');
});

test('src/index.css body font stack prioritizes Pretendard, Noto Sans KR, Malgun Gothic before generic sans-serif', () => {
  const bodyBlockMatch = cssSource.match(/body\s*\{([^}]*)\}/);
  assert.ok(bodyBlockMatch, 'expected a body {} rule in src/index.css');
  const fontFamilyMatch = bodyBlockMatch[1].match(/font-family\s*:\s*([^;]+);/);
  assert.ok(fontFamilyMatch, 'expected a font-family declaration inside body {}');

  const stack = fontFamilyMatch[1].split(',').map(f => f.trim().replace(/^['"]|['"]$/g, ''));
  const pretendardIdx = stack.indexOf('Pretendard');
  const notoSansKrIdx = stack.indexOf('Noto Sans KR');
  const malgunGothicIdx = stack.indexOf('Malgun Gothic');
  const genericSansIdx = stack.indexOf('sans-serif');

  assert.notEqual(pretendardIdx, -1, 'font stack must include Pretendard');
  assert.notEqual(notoSansKrIdx, -1, 'font stack must include Noto Sans KR');
  assert.notEqual(malgunGothicIdx, -1, 'font stack must include Malgun Gothic');
  assert.notEqual(genericSansIdx, -1, 'font stack must keep a generic sans-serif fallback');

  assert.ok(pretendardIdx < genericSansIdx, 'Pretendard must come before the generic sans-serif fallback');
  assert.ok(notoSansKrIdx < genericSansIdx, 'Noto Sans KR must come before the generic sans-serif fallback');
  assert.ok(malgunGothicIdx < genericSansIdx, 'Malgun Gothic must come before the generic sans-serif fallback');
});

test('electron-builder.config.cjs preserves the Pioneer_v${version}_portable.exe naming contract', () => {
  // The `${version}` placeholder contains a literal '}', which breaks a
  // naive `[^}]*` block-body capture (it stops at that inner brace before
  // reaching artifactName's closing quote). Match the exact expected
  // artifactName value directly within the portable {} block instead, so
  // the assertion cannot be fooled by the template-literal-style braces.
  assert.match(
    builderSource,
    /portable\s*:\s*\{\s*artifactName\s*:\s*['"]Pioneer_v\$\{version\}_portable\.exe['"]\s*,?\s*\}/,
    'portable {} block must set artifactName exactly to Pioneer_v${version}_portable.exe'
  );
});

test('package.json "main" points to electron/main.cjs, which must exist (regression: electron-builder failed with "Application entry file index.js ... does not exist")', () => {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, { encoding: 'utf8' }));
  assert.equal(
    pkg.main,
    'electron/main.cjs',
    'package.json "main" must be exactly "electron/main.cjs" so electron-builder packages the correct entry file instead of the default index.js'
  );
  assert.ok(
    fs.existsSync(ELECTRON_MAIN_PATH),
    'electron/main.cjs must exist on disk at the path referenced by package.json "main"'
  );
});
