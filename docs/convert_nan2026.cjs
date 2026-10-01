/**
 * NAN 2026 제출 문서 v2 → HTML 변환 (일회성)
 */
const fs = require('fs');
const path = require('path');

const HTML_STYLE = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{TITLE}}</title>
  <style>
    @media print { body { max-width: 100%; padding: 20px; } }
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",sans-serif;line-height:1.7;max-width:900px;margin:0 auto;padding:48px 32px;color:#1a1e26;background:#fff}
    h1{font-size:32px;margin:0 0 6px;letter-spacing:-0.5px}
    h2{font-size:20px;margin-top:36px;border-bottom:2px solid #e8eaed;padding-bottom:8px;color:#2c2f36}
    h3{font-size:16px;margin-top:24px;color:#444}
    h4{font-size:15px;margin-top:18px;color:#555}
    p,li,pre{font-size:15px;line-height:1.75}
    li{margin:4px 0}
    pre{white-space:pre-wrap;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:14px 16px;font-family:monospace;font-size:13.5px}
    table{border-collapse:collapse;width:100%;margin:14px 0;font-size:14px}
    th,td{border:1px solid #dde1e7;padding:9px 13px;text-align:left}
    th{background:#f3f4f6;font-weight:600;color:#333}
    tr:nth-child(even) td{background:#fafbfc}
    .meta{color:#777;font-size:13px;margin-bottom:36px;border-bottom:1px solid #eee;padding-bottom:12px}
    hr{border:none;border-top:1px solid #e8eaed;margin:32px 0}
    blockquote{border-left:4px solid #4f8ef7;margin:16px 0;padding:10px 18px;color:#444;background:#f0f4ff;border-radius:0 8px 8px 0;font-style:italic}
    code{background:#f0f0f0;border-radius:4px;padding:2px 6px;font-size:13px;font-family:monospace}
    a{color:#4f8ef7}
  </style>
</head>
<body>
{{BODY}}
</body>
</html>`;

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMarkdown(text) {
  text = text.replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return text;
}

function convertMd(mdContent) {
  const lines = mdContent.split('\n');
  let html = '';
  let i = 0;
  let inTable = false, tableRows = [];
  let inCodeBlock = false, codeLines = [], codeLang = '';
  let inBlockquote = false, blockquoteLines = [];
  let inList = false, listItems = [], listOrdered = false;
  let title = '', metaLine = '';

  for (let j = 0; j < Math.min(lines.length, 10); j++) {
    if (lines[j].startsWith('# ') && !title) title = lines[j].substring(2).trim();
    if (lines[j].startsWith('> ') && !metaLine) metaLine = lines[j].substring(2).trim();
  }

  function flushTable() {
    if (!tableRows.length) return;
    let t = '<table>\n';
    let headerDone = false;
    for (const row of tableRows) {
      if (/^\|[-| :]+\|$/.test(row.trim())) continue;
      const cells = row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      if (!headerDone) {
        t += `  <thead><tr>${cells.map(c => `<th>${inlineMarkdown(c)}</th>`).join('')}</tr></thead>\n  <tbody>\n`;
        headerDone = true;
      } else {
        t += `    <tr>${cells.map(c => `<td>${inlineMarkdown(c)}</td>`).join('')}</tr>\n`;
      }
    }
    t += '  </tbody>\n</table>';
    html += t + '\n';
    tableRows = []; inTable = false;
  }
  function flushList() {
    if (!listItems.length) return;
    const tag = listOrdered ? 'ol' : 'ul';
    html += `<${tag}>\n${listItems.map(x => `  <li>${inlineMarkdown(x)}</li>`).join('\n')}\n</${tag}>\n`;
    listItems = []; inList = false;
  }
  function flushBlockquote() {
    if (!blockquoteLines.length) return;
    html += `<blockquote><p>${inlineMarkdown(blockquoteLines.join(' ').trim())}</p></blockquote>\n`;
    blockquoteLines = []; inBlockquote = false;
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        flushTable(); flushList(); flushBlockquote();
        inCodeBlock = true; codeLines = []; codeLang = line.slice(3).trim();
      } else {
        html += `<pre>${escapeHtml(codeLines.join('\n'))}</pre>\n`;
        inCodeBlock = false;
      }
      i++; continue;
    }
    if (inCodeBlock) { codeLines.push(line); i++; continue; }

    if (line.trim().startsWith('|')) {
      if (!inTable) { flushList(); flushBlockquote(); inTable = true; }
      tableRows.push(line); i++; continue;
    } else if (inTable) { flushTable(); }

    if (line.startsWith('> ')) {
      if (!inBlockquote) { flushList(); inBlockquote = true; }
      blockquoteLines.push(line.substring(2)); i++; continue;
    } else if (inBlockquote) { flushBlockquote(); }

    if (/^---+$/.test(line.trim())) { flushList(); html += '<hr>\n'; i++; continue; }

    if (line.startsWith('# ')) {
      flushList();
      html += `<h1>${inlineMarkdown(line.substring(2).trim())}</h1>\n`;
      if (metaLine) html += `<p class="meta">${escapeHtml(metaLine)}</p>\n`;
      i++; continue;
    }
    if (line.startsWith('## ')) { flushList(); html += `<h2>${inlineMarkdown(line.substring(3).trim())}</h2>\n`; i++; continue; }
    if (line.startsWith('### ')) { flushList(); html += `<h3>${inlineMarkdown(line.substring(4).trim())}</h3>\n`; i++; continue; }
    if (line.startsWith('#### ')) { flushList(); html += `<h4>${inlineMarkdown(line.substring(5).trim())}</h4>\n`; i++; continue; }

    if (line.startsWith('> ') && line.substring(2).trim() === metaLine) { i++; continue; }

    const om = line.match(/^(\d+)\. (.*)/);
    const um = line.match(/^[-*] (.*)/);
    if (om) {
      if (!inList || !listOrdered) { flushList(); inList = true; listOrdered = true; }
      listItems.push(om[2]); i++; continue;
    }
    if (um) {
      if (!inList || listOrdered) { flushList(); inList = true; listOrdered = false; }
      listItems.push(um[1]); i++; continue;
    }
    if (inList && line.trim() === '') { flushList(); }

    if (line.trim() === '') { i++; continue; }
    flushList();
    html += `<p>${inlineMarkdown(line.trim())}</p>\n`;
    i++;
  }
  flushTable(); flushList(); flushBlockquote();
  return { html, title: title || 'Document' };
}

const files = [
  {
    md: path.join(__dirname, 'Pioneer_NAN2026_GameIntro_v2.md'),
    html: path.join(__dirname, 'Pioneer_NAN2026_GameIntro_v2.html'),
  },
  {
    md: path.join(__dirname, 'Pioneer_NAN2026_AI_TechNote_v2.md'),
    html: path.join(__dirname, 'Pioneer_NAN2026_AI_TechNote_v2.html'),
  },
];

for (const f of files) {
  try {
    const md = fs.readFileSync(f.md, 'utf8');
    const { html, title } = convertMd(md);
    const out = HTML_STYLE.replace('{{TITLE}}', title).replace('{{BODY}}', html);
    fs.writeFileSync(f.html, out, 'utf8');
    console.log(`OK  ${path.basename(f.html)}`);
  } catch (e) {
    console.error(`ERR ${f.md}: ${e.message}`);
  }
}
