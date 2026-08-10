// Pioneer 데모 녹화 + CDP 자동 플레이
// 1. ffmpeg 녹화 시작
// 2. CDP로 게임 조작 (3분)
// 3. 녹화 종료 → 10배속 변환
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const FFMPEG = 'C:\\Users\\오진우\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';
const RAW_OUT   = 'C:\\Development\\2_Pioneer\\demo_raw.mp4';
const FINAL_OUT = 'C:\\Development\\2_Pioneer\\pioneer_demo_10x.mp4';
const RECORD_SEC = 180; // 3분 녹화 → 10배속 → 18초

const WS_URL = 'ws://localhost:9222/devtools/page/1D1742CBEC7F664CB77605588BBB200C';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── ffmpeg 녹화 ──────────────────────────────────────────────
function startRecording() {
  const proc = spawn(FFMPEG, [
    '-y',
    '-f', 'gdigrab',
    '-framerate', '30',
    '-i', 'title=Pioneer: 항해와 정보의 시대',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    RAW_OUT,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  proc.stderr.on('data', d => {
    const line = d.toString();
    if (line.includes('frame=')) process.stdout.write('\r  ' + line.trim().slice(0, 80));
  });
  return proc;
}

function stopRecording(proc) {
  return new Promise(res => {
    proc.on('close', res);
    proc.stdin.write('q');
  });
}

// ── CDP 플레이 ────────────────────────────────────────────────
let msgId = 1;
let ws;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((res, rej) => {
    const id = msgId++;
    pending.set(id, { resolve: res, reject: rej });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(`Timeout: ${method}`)); } }, 8000);
  });
}

async function eval_(code) {
  try {
    const r = await send('Runtime.evaluate', { expression: code, returnByValue: true });
    return r?.result?.value;
  } catch { return null; }
}

async function clickText(text) {
  return eval_(`(()=>{
    const el = Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('${text}'));
    if(!el) return null;
    el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
    return el.textContent.trim().slice(0,40);
  })()`);
}

async function getButtonTexts() {
  return eval_(`Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim().slice(0,25)).filter(t=>t).slice(0,12).join(' | ')`);
}

async function playGame() {
  ws = new WebSocket(WS_URL);
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const {resolve}=pending.get(m.id); pending.delete(m.id); resolve(m.result); }
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  await send('Runtime.enable');
  await sleep(1000);

  console.log('\n[00] 시작 화면');
  console.log('버튼:', await getButtonTexts());

  // 항해 시작 (또는 계속하기)
  const start = await clickText('항해 시작') || await clickText('계속하기');
  console.log('[01] 시작:', start);
  await sleep(2000);

  // 인트로 건너뛰기
  await clickText('건너뛰기');
  for (let i = 0; i < 6; i++) {
    const r = await clickText('다음'); if (!r) break;
    await sleep(600);
  }
  console.log('[02] 인트로 통과');
  await sleep(500);

  // ─ 반복 루프: 포트 방문 & 교역 ───────────────────────────
  const actions = [
    // 시장 모달이 열려있으면 거래 후 닫기
    async () => {
      const btns = await getButtonTexts();
      if (btns?.includes('최대')) {
        console.log('[교역] 최대 매입');
        await clickText('최대');
        await sleep(400);
        const buyBtn = await eval_(`(()=>{
          const b=Array.from(document.querySelectorAll('button')).find(e=>e.textContent.match(/매입|구매|buy/i));
          if(b){b.dispatchEvent(new MouseEvent('click',{bubbles:true}));return b.textContent.slice(0,20);}
          return null;
        })()`);
        console.log('  매입:', buyBtn);
        await sleep(600);
        await clickText('✕');
        await sleep(800);
      }
    },
    // 지도에서 포트 클릭
    async () => {
      console.log('[포트] 지도 포트 탐색');
      const r = await eval_(`(()=>{
        const btns = Array.from(document.querySelectorAll('button'));
        // 포트 버튼: 작고 특정 클래스 or 텍스트
        const port = btns.find(b=>
          (b.className.includes('port') || b.className.includes('harbor') ||
           b.textContent.match(/^[가-힣]+$/) && b.textContent.length<=5 && b.offsetWidth<120)
        );
        if(port){
          port.dispatchEvent(new MouseEvent('click',{bubbles:true}));
          return 'port:'+port.textContent.trim().slice(0,20);
        }
        // 맵 위 SVG/canvas 요소 클릭 시뮬레이션
        const map=document.querySelector('[class*="map"],[class*="canvas"]');
        if(map){map.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:600,clientY:400}));return 'map click';}
        return 'no port:'+btns.length;
      })()`);
      console.log('  결과:', r);
      await sleep(1200);
    },
    // 출항 버튼
    async () => {
      const r = await clickText('출항') || await clickText('항해') || await clickText('이동');
      if (r) { console.log('[출항]', r); await sleep(2000); }
    },
    // 다음 날 진행
    async () => {
      const r = await clickText('다음 날') || await clickText('항해 시작') || await clickText('대기');
      if (r) { console.log('[시간]', r); await sleep(1000); }
    },
    // 모달 닫기
    async () => {
      const r = await clickText('✕') || await clickText('닫기') || await clickText('확인');
      if (r) { console.log('[닫기]', r); await sleep(500); }
    },
  ];

  // 3분 동안 반복 실행
  const endTime = Date.now() + RECORD_SEC * 1000 - 5000; // 마지막 5초 여유
  let cycle = 0;
  while (Date.now() < endTime) {
    cycle++;
    const action = actions[cycle % actions.length];
    try { await action(); } catch(e) { /* ignore */ }
    await sleep(500);
    const elapsed = Math.round((Date.now() - (endTime - RECORD_SEC * 1000 + 5000)) / 1000);
    process.stdout.write(`\r  [${elapsed}s/${RECORD_SEC}s] cycle=${cycle} `);
  }

  console.log('\n\n[완료] 플레이 루프 종료');
  ws.close();
}

// ── 10배속 변환 ───────────────────────────────────────────────
async function speedUp() {
  console.log('\n[변환] 10배속 처리 중...');
  return new Promise((res, rej) => {
    const proc = spawn(FFMPEG, [
      '-y', '-i', RAW_OUT,
      '-vf', 'setpts=0.1*PTS',
      '-an',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      FINAL_OUT,
    ]);
    proc.stderr.on('data', d => {
      const l = d.toString();
      if (l.includes('frame=')) process.stdout.write('\r  ' + l.trim().slice(0, 80));
    });
    proc.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg speedup failed: ' + code)));
  });
}

// ── 메인 ─────────────────────────────────────────────────────
async function main() {
  console.log(`Pioneer 데모 녹화 시작 (${RECORD_SEC}초 → 10배속)\n`);

  // ffmpeg 녹화 시작
  const recorder = startRecording();
  await sleep(1500); // 녹화 안정화

  // CDP 플레이
  try {
    await playGame();
  } catch(e) {
    console.error('플레이 오류:', e.message);
  }

  // 녹화 중지
  console.log('녹화 중지 중...');
  await stopRecording(recorder);

  // 10배속 변환
  await speedUp();

  console.log(`\n\n완료! ${FINAL_OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
