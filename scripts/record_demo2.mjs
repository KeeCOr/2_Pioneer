// Pioneer 데모 녹화 v2 — desktop capture + CDP 자동 플레이
import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
// Node.js 24 built-in WebSocket 사용 (ws 패키지 불필요)

const FFMPEG   = 'C:\\Users\\오진우\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';
const RAW_OUT  = 'C:\\Development\\2_Pioneer\\demo_raw.mp4';
const FAST_OUT = 'C:\\Development\\2_Pioneer\\pioneer_demo_10x.mp4';
const RECORD_SEC = 180;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Pioneer는 TOPMOST로 설정돼 있어 bringToFront 불필요
function bringToFront() { /* no-op: Pioneer is already TOPMOST */ }

// CDP 헬퍼
let msgId = 1, ws;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((res, rej) => {
    const id = msgId++;
    pending.set(id, { resolve: res, reject: rej });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(`TO:${method}`)); } }, 8000);
  });
}

async function js(code) {
  try { return (await send('Runtime.evaluate', { expression: code, returnByValue: true }))?.result?.value; }
  catch { return null; }
}

async function clickText(text) {
  return js(`(()=>{const el=Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('${text}'));if(!el)return null;el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return el.textContent.trim().slice(0,40);})()`);
}

async function getButtons() {
  return js(`Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim().slice(0,18)).filter(t=>t).slice(0,8).join('|')`);
}

// CDP URL 가져오기
function getCdpUrl() {
  return new Promise((res, rej) => {
    http.get('http://localhost:9222/json/list', resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        const t = JSON.parse(d).find(x => x.type === 'page');
        res(t?.webSocketDebuggerUrl);
      });
    }).on('error', rej);
  });
}

// ffmpeg 녹화
function startRecording() {
  const p = spawn(FFMPEG, [
    '-y', '-f', 'gdigrab',
    '-offset_x', '0', '-offset_y', '0', '-video_size', '1920x1080',
    '-framerate', '24', '-i', 'desktop',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    '-t', String(RECORD_SEC + 10),
    RAW_OUT,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  p.stderr.on('data', d => {
    if (d.toString().includes('frame=')) process.stdout.write('\r  ' + d.toString().trim().slice(0, 70));
  });
  return p;
}

// 10배속 변환
function speedUp() {
  return new Promise((res, rej) => {
    console.log('\n\n10배속 변환...');
    const p = spawn(FFMPEG, [
      '-y', '-i', RAW_OUT,
      '-vf', 'setpts=0.1*PTS',
      '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
      FAST_OUT,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    p.stderr.on('data', d => { if (d.toString().includes('frame=')) process.stdout.write('\r  ' + d.toString().trim().slice(0, 80)); });
    p.on('close', c => c === 0 ? res() : rej(new Error('speedup exit:' + c)));
  });
}

async function main() {
  const wsUrl = await getCdpUrl();
  if (!wsUrl) throw new Error('CDP URL not found - is Pioneer running with --remote-debugging-port=9222?');
  console.log('CDP:', wsUrl);

  bringToFront();
  await sleep(2000);

  // 녹화 시작
  const rec = startRecording();
  await sleep(2000);

  // CDP 연결
  ws = new WebSocket(wsUrl);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); } };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  await send('Runtime.enable');
  console.log('CDP 연결 OK');

  bringToFront(); await sleep(1000);
  console.log('버튼:', await getButtons());

  // 항해 시작
  const start = await clickText('항해 시작') ?? await clickText('계속하기');
  console.log('[시작]', start);
  bringToFront(); await sleep(2500);

  // 인트로 처리
  await clickText('건너뛰기');
  for (let i = 0; i < 8; i++) { if (!await clickText('다음')) break; await sleep(600); }
  bringToFront(); await sleep(1000);

  // 3분 플레이 루프
  const endAt = Date.now() + (RECORD_SEC - 15) * 1000;
  let cycle = 0;

  while (Date.now() < endAt) {
    cycle++;
    const mod = cycle % 6;

    if (mod === 0) bringToFront();

    const btns = await getButtons() ?? '';

    // 시장 열려있으면 거래
    if (btns.includes('최대')) {
      await clickText('최대'); await sleep(300);
      await js(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(e=>e.textContent.match(/매입|구매/));if(b)b.dispatchEvent(new MouseEvent('click',{bubbles:true}));return b?.textContent??'none';})()`);
      await sleep(400); await clickText('✕'); await sleep(700);
      console.log('\n[교역완료]');
      continue;
    }

    // 출항 버튼
    if (btns.includes('출항')) {
      console.log('\n[출항]', await clickText('출항')); bringToFront(); await sleep(2000); continue;
    }

    // 이벤트/모달 닫기
    if (btns.includes('확인') || btns.includes('닫기')) {
      await clickText('확인'); await clickText('닫기'); await sleep(500); continue;
    }

    // 작은 버튼(포트) 클릭
    const portClick = await js(`(()=>{
      const btns=Array.from(document.querySelectorAll('button'));
      const p=btns.find(b=>{const t=b.textContent.trim();
        return /[가-힣]/.test(t) && t.length>=2 && t.length<=5 &&
               !t.match(/현황|현재|최대|전량|출항|이동|다음|이전|닫기|확인|취소|매입|판매|교역|저장|선원|항구|선박|상황|쿠|퀘|추|일|보/);
      });
      if(p){p.dispatchEvent(new MouseEvent('click',{bubbles:true}));return p.textContent.trim();}
      return null;
    })()`);
    if (portClick) { console.log('\n[포트]', portClick); await sleep(1500); continue; }

    // 현황 토글
    if (mod === 3) { await clickText('현황'); await sleep(800); await clickText('✕'); }

    await sleep(600);
    const rem = Math.round((endAt - Date.now()) / 1000);
    process.stdout.write(`\r  남은:${rem}s cy:${cycle} btns:${btns.slice(0, 40)} `);
  }

  console.log('\n\n루프 종료');
  ws.close();

  // 녹화 중지
  rec.stdin.write('q');
  await new Promise(res => rec.on('close', res));

  const sz = fs.statSync(RAW_OUT).size;
  console.log(`raw: ${(sz / 1024 / 1024).toFixed(1)} MB`);

  if (sz > 500_000) {
    await speedUp();
    const fsz = fs.statSync(FAST_OUT).size;
    console.log(`\n완료: pioneer_demo_10x.mp4 (${(fsz / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    console.error('녹화 실패: 파일 크기가 너무 작음');
  }
}

main().catch(e => { console.error('\n오류:', e.message); process.exit(1); });
