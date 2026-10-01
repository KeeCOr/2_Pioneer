// Pioneer 공모전 데모 녹화 v3
// 4분 녹화 → 2배속 → 2분 영상
import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';

const FFMPEG = 'C:\\Users\\오진우\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';
const PIONEER_EXE = 'C:\\Development\\2_Pioneer\\Pioneer_v1.8.1_portable.exe';
const RAW_OUT  = 'C:\\Development\\2_Pioneer\\demo_raw.mp4';
const COMP_OUT = 'C:\\Development\\2_Pioneer\\pioneer_competition.mp4';
const RECORD_SEC = 240;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...args) => { process.stdout.write('\n' + args.join(' ')); };

// ── CDP ──────────────────────────────────────────────────────
let msgId = 1, ws;
const pending = new Map();

function cdp(method, params = {}) {
  return new Promise((res, rej) => {
    const id = msgId++;
    pending.set(id, { resolve: res, reject: rej });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(`TO:${method}`)); } }, 8000);
  });
}

async function js(code) {
  try { return (await cdp('Runtime.evaluate', { expression: code, returnByValue: true }))?.result?.value; }
  catch { return null; }
}

async function clickText(text) {
  return js(`(()=>{const el=Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('${text.replace(/'/g,"\\'")}'));if(!el)return null;el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return el.textContent.trim().slice(0,40);})()`);
}

async function getButtons() {
  return js(`Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim().slice(0,18)).filter(t=>t).slice(0,14).join('|')`);
}

// 모달 닫기
async function closeAll() {
  for (let i = 0; i < 12; i++) {
    const btns = await getButtons() ?? '';
    const isX = btns.split('|').some(t => t.trim() === '✕');
    if (isX) {
      await js(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim()==='✕');if(b)b.dispatchEvent(new MouseEvent('click',{bubbles:true}));})()`);
      await sleep(350);
    } else if (btns.includes('닫기')) {
      await clickText('닫기'); await sleep(350);
    } else break;
  }
}

// 포트 nameplate 클릭 (map 위 항구 레이블)
async function clickPortByNameplate(idx = 0) {
  return js(`(()=>{
    const labels = Array.from(document.querySelectorAll('[class*="port-nameplate"]'))
      .filter(el => el.textContent.trim().length > 0);
    const label = labels[${idx}];
    if (!label) return null;
    const parent = label.parentElement;
    if (parent) {
      parent.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
      return label.textContent.trim().slice(0, 20);
    }
    return null;
  })()`);
}

// 현재 정박 중인 선박 버튼 클릭 (route mode 진입)
async function selectDockedShip() {
  return js(`(()=>{
    const btns = Array.from(document.querySelectorAll('button'));
    const ship = btns.find(b => {
      const t = b.textContent;
      return (t.includes('⚓') || t.includes('정박')) && b.offsetWidth > 80;
    });
    if (ship) {
      ship.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
      return ship.textContent.trim().slice(0, 30);
    }
    return null;
  })()`);
}

// CDP URL
function getCdpUrl() {
  return new Promise(res => {
    http.get('http://localhost:9222/json/list', resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        try { res(JSON.parse(d).find(x => x.type === 'page')?.webSocketDebuggerUrl); }
        catch { res(null); }
      });
    }).on('error', () => res(null));
  });
}

async function connect() {
  let wsUrl = await getCdpUrl();
  if (!wsUrl) {
    log('Pioneer 실행 중...');
    spawn(PIONEER_EXE, ['--disable-gpu', '--remote-debugging-port=9222'], { detached: true, stdio: 'ignore' });
    for (let i = 0; i < 20; i++) {
      await sleep(1500);
      wsUrl = await getCdpUrl();
      if (wsUrl) { await sleep(3000); break; }
      process.stdout.write(`\r  Pioneer 시작 대기 ${i+1}/20`);
    }
    wsUrl = wsUrl ?? await getCdpUrl();
  }
  if (!wsUrl) throw new Error('CDP 연결 실패');

  ws = new WebSocket(wsUrl);
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); }
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  await cdp('Runtime.enable');

  // TOPMOST
  try {
    execSync(
      `powershell -NoProfile -WindowStyle Hidden -Command "$p=Get-Process|?{$_.MainWindowTitle -like '*Pioneer*'}|Select -First 1;if($p){Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class W{[DllImport(\\"user32.dll\\")]public static extern bool SetWindowPos(IntPtr h,IntPtr i,int x,int y,int cx,int cy,uint f);}';[W]::SetWindowPos($p.MainWindowHandle,[IntPtr]::new(-1),0,0,0,0,3)|Out-Null}"`,
      { timeout: 8000 }
    );
    log('TOPMOST 설정 완료');
  } catch { log('TOPMOST 실패 (무시)'); }

  return wsUrl;
}

// 녹화
function startRecording() {
  const p = spawn(FFMPEG, [
    '-y', '-f', 'gdigrab',
    '-offset_x', '0', '-offset_y', '0', '-video_size', '1920x1080',
    '-framerate', '30', '-i', 'desktop',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-t', String(RECORD_SEC + 20), RAW_OUT,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  p.stderr.on('data', d => { if (d.toString().includes('frame=')) process.stdout.write('\r  ' + d.toString().trim().slice(0,72)); });
  return p;
}

function speedUp() {
  return new Promise((res, rej) => {
    log('\n2배속 변환 중...');
    const p = spawn(FFMPEG, [
      '-y', '-i', RAW_OUT,
      '-vf', 'setpts=0.5*PTS', '-an',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
      COMP_OUT,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    p.stderr.on('data', d => { if (d.toString().includes('frame=')) process.stdout.write('\r  ' + d.toString().trim().slice(0,80)); });
    p.on('close', c => c === 0 ? res() : rej(new Error('speedup exit:' + c)));
  });
}

// ── 데모 시퀀스 ───────────────────────────────────────────────
async function runDemo() {
  const btns0 = await getButtons() ?? '';
  log('초기 버튼:', btns0.slice(0, 80));

  // 시작화면 처리
  if (btns0.includes('항해 시작') || btns0.includes('새 게임')) {
    await clickText('항해 시작') || await clickText('새 게임');
    await sleep(2500);
    await clickText('건너뛰기'); await sleep(400);
    for (let i = 0; i < 10; i++) { if (!await clickText('다음')) break; await sleep(600); }
    await sleep(800);
  } else if (btns0.includes('계속하기')) {
    await clickText('계속하기'); await sleep(2000);
  }

  // ✕ 모달 닫기 (승무원 배정 오버레이 등)
  log('[초기화] 모달 닫기...');
  await closeAll();
  await sleep(800);

  // ── 씬 1: 월드맵 전경 (6초) ──────────────────────────────────
  log('[씬1] 월드맵 전경');
  await sleep(6000);

  // ── 씬 2: 시장(교역) — 현재 포트에서 즉시 ──────────────────
  log('[씬2] 시장 열기');
  const marketOpen = await clickText('시장');
  if (marketOpen) {
    log('  시장 열림:', marketOpen);
    await sleep(2500);

    // 자원 아이콘 5개 순서대로 탐색
    for (let i = 0; i < 5; i++) {
      await js(`(()=>{
        const rows = Array.from(document.querySelectorAll('button'))
          .filter(b => b.querySelector('img') && b.offsetWidth > 50 && b.offsetWidth < 500);
        if(rows[${i}]) rows[${i}].dispatchEvent(new MouseEvent('click',{bubbles:true}));
      })()`);
      await sleep(1000);
    }

    // 최대 매입
    log('  [매입] 최대 구매');
    if (await clickText('최대')) {
      await sleep(500);
      await js(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(e=>e.textContent.match(/매입|구매/));if(b)b.dispatchEvent(new MouseEvent('click',{bubbles:true}));})()`);
      await sleep(1200);
    }
    await sleep(1500);
    await closeAll(); // 시장 닫기
    await sleep(600);
  }

  // ── 씬 3: HUD 투어 ─────────────────────────────────────────
  log('[씬3] HUD - 승무원');
  await clickText('승무원'); await sleep(3000); await closeAll(); await sleep(600);

  log('[씬3] HUD - 퀘스트');
  await clickText('퀘스트'); await sleep(3000); await closeAll(); await sleep(600);

  log('[씬3] HUD - 일일목표');
  await clickText('일일목표'); await sleep(2500); await closeAll(); await sleep(600);

  // ── 씬 4: 선박 선택 → route mode 진입 ─────────────────────
  log('[씬4] 선박 선택 (route mode)');
  const shipSel = await selectDockedShip();
  log('  선택 선박:', shipSel);
  await sleep(2000);

  // ── 씬 5: 포트 nameplate 클릭 → 시세 모달 (목적지 확정 검증) ─
  log('[씬5] 포트 시세 확인');
  let sailPortFound = false;
  for (let pi = 0; pi < 10; pi++) {
    const portName = await clickPortByNameplate(pi);
    if (!portName || portName.includes('금 필요') || portName.includes('Unknown')) continue;
    log(`  포트${pi}:`, portName);
    await sleep(1500);

    // 목적지 확정 버튼이 나타났는지 확인
    const btns = await getButtons() ?? '';
    if (btns.includes('목적지 확정')) {
      sailPortFound = true;
      // 시세 자원 3개 탐색
      for (let ri = 0; ri < 3; ri++) {
        await js(`(()=>{
          const items = Array.from(document.querySelectorAll('button'))
            .filter(b => b.offsetWidth < 200 && b.offsetWidth > 20 && /[가-힣]/.test(b.textContent.trim()) && b.textContent.trim().length <= 5);
          if(items[${ri}]) items[${ri}].dispatchEvent(new MouseEvent('click',{bubbles:true}));
        })()`);
        await sleep(1500);
      }
      await sleep(1200);
      break;
    }
    // 시장이 열렸으면 닫기 (현재 포트 클릭 시)
    if (btns.includes('✕')) { await closeAll(); await sleep(400); }
  }

  // ── 씬 6: 목적지 확정 → 출항 ───────────────────────────────
  if (sailPortFound) {
    log('[씬6] 목적지 확정');
    const confirm = await clickText('목적지 확정');
    log('  결과:', confirm);
    await sleep(3500);
  } else {
    log('[씬6] 목적지 확정 버튼 없음 - 건너뜀');
  }

  // ── 씬 7: 항해 중 모습 ─────────────────────────────────────
  log('[씬7] 항해 시작');
  await sleep(5000);
}

async function adaptiveLoop(endAt) {
  let cycle = 0;
  while (Date.now() < endAt) {
    cycle++;
    const btns = await getButtons() ?? '';
    const rem = Math.round((endAt - Date.now()) / 1000);

    if (btns.split('|').some(t => t.trim() === '✕') && !btns.includes('시장')) {
      await closeAll(); await sleep(400); continue;
    }
    if (btns.includes('확인') && !btns.includes('항해') && !btns.includes('시작')) {
      await clickText('확인'); await sleep(400); continue;
    }
    if (btns.includes('닫기') && !btns.includes('시장')) {
      await clickText('닫기'); await sleep(400); continue;
    }

    // 시장 열려있으면 교역
    if (btns.includes('시장') && cycle % 10 === 1) {
      log('\n  [시장] 교역...');
      await clickText('시장'); await sleep(2000);
      if (await clickText('최대')) {
        await sleep(500);
        await js(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(e=>e.textContent.match(/매입|구매/));if(b)b.dispatchEvent(new MouseEvent('click',{bubbles:true}));})()`);
        await sleep(1000);
      }
      await closeAll(); continue;
    }

    // 선박 선택 후 포트 클릭 → 목적지 확정
    if (cycle % 18 === 0) {
      log('\n  [출항 시도]...');
      await selectDockedShip(); await sleep(1000);
      for (let pi = 0; pi < 8; pi++) {
        const p = await clickPortByNameplate(pi);
        if (p && p.length > 1) {
          log('  포트:', p);
          await sleep(2000);
          const r = await clickText('목적지 확정');
          if (r) { log('  출항!', r); await sleep(3000); break; }
          await closeAll();
          break;
        }
      }
      continue;
    }

    // HUD 순환
    if (cycle % 25 === 0) {
      const hudList = ['퀘스트','일일목표','승무원'];
      await clickText(hudList[(cycle/25|0) % 3]);
      await sleep(2000); await closeAll();
    }

    await sleep(800);
    process.stdout.write(`\r  남은:${rem}s cy:${cycle} ${btns.slice(0,48)} `);
  }
}

// ── 메인 ─────────────────────────────────────────────────────
async function main() {
  log('Pioneer 공모전 데모 녹화 v3 (4분 → 2배속 → 2분)\n');

  const wsUrl = await connect();
  log('CDP OK:', wsUrl.slice(0, 60));
  await sleep(2000);

  const rec = startRecording();
  await sleep(3000);
  log('\n녹화 시작!\n');

  await runDemo();
  const endAt = Date.now() + (RECORD_SEC - 60) * 1000;
  await adaptiveLoop(endAt);

  log('\n\n루프 종료, 녹화 중지...');
  ws.close();
  rec.stdin.write('q');
  await new Promise(r => rec.on('close', r));

  const sz = fs.statSync(RAW_OUT).size;
  log(`raw: ${(sz / 1024 / 1024).toFixed(1)} MB`);

  if (sz > 500_000) {
    await speedUp();
    const fsz = fs.statSync(COMP_OUT).size;
    log(`\n완료! pioneer_competition.mp4 (${(fsz / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    log('녹화 실패: 파일 크기 너무 작음');
    process.exit(1);
  }
}

main().catch(e => { log('\n오류:', e.message); process.exit(1); });
