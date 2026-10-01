// Pioneer CDP 자동 플레이 데모
const WS_URL = 'ws://localhost:9222/devtools/page/1D1742CBEC7F664CB77605588BBB200C';

let msgId = 1;
let ws;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }
    }, 10000);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function clickText(text) {
  const result = await send('Runtime.evaluate', {
    expression: `(()=>{
      const el = Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('${text}'));
      if(!el) return 'not found';
      el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
      return 'clicked:'+el.textContent.trim().slice(0,40);
    })()`,
    returnByValue: true,
  });
  return result?.result?.value;
}

async function getButtons() {
  const result = await send('Runtime.evaluate', {
    expression: `Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim().slice(0,30)).filter(t=>t).slice(0,15).join(' | ')`,
    returnByValue: true,
  });
  return result?.result?.value;
}

async function screenshot(name) {
  try {
    const result = await send('Page.captureScreenshot', { format: 'png' });
    if (result?.data) {
      const { writeFileSync } = await import('fs');
      writeFileSync(`C:\\Development\\2_Pioneer\\cdp_${name}.png`, Buffer.from(result.data, 'base64'));
      console.log(`  -> saved cdp_${name}.png`);
    }
  } catch(e) { console.log(`  screenshot failed: ${e.message}`); }
}

async function main() {
  ws = new WebSocket(WS_URL);
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const {resolve}=pending.get(m.id); pending.delete(m.id); resolve(m.result); }
  };
  await new Promise((res,rej) => { ws.onopen=res; ws.onerror=rej; });

  await send('Runtime.enable');
  await send('Page.enable');
  await sleep(500);

  console.log('버튼:', await getButtons());
  await screenshot('01_init');

  // 항해 시작
  console.log('[1] 항해 시작');
  console.log(await clickText('항해 시작'));
  await sleep(2000);
  console.log('버튼:', await getButtons());
  await screenshot('02_sailed');

  // 인트로 슬라이드 건너뛰기
  console.log('[2] 건너뛰기');
  console.log(await clickText('건너뛰기'));
  await sleep(1000);

  // 다음 버튼 반복 클릭
  for (let i = 0; i < 10; i++) {
    const r = await clickText('다음');
    if (r?.includes('not found')) break;
    console.log(`  슬라이드 ${i+1}:`, r);
    await sleep(700);
  }
  await screenshot('03_game');
  console.log('게임 진입 버튼:', await getButtons());

  // 새 게임 (저장된 게임 없을 시)
  const r = await clickText('새 게임');
  if (!r?.includes('not found')) { console.log('[3] 새 게임:', r); await sleep(1500); }

  await screenshot('04_map');
  console.log('맵 화면 버튼:', await getButtons());

  // 포트 클릭 시도
  const portClick = await send('Runtime.evaluate', {
    expression: `(()=>{
      const btns = Array.from(document.querySelectorAll('button'));
      const port = btns.find(b => {
        const t = b.textContent;
        return t.match(/항구|교역소|도시|항/) || b.className.match(/port|harbor/);
      });
      if(port){port.dispatchEvent(new MouseEvent('click',{bubbles:true}));return 'port:'+port.textContent.slice(0,30);}
      // 지도 위 작은 버튼 (포트 아이콘)
      const small = btns.find(b=>b.offsetWidth<80&&b.offsetWidth>10);
      if(small){small.dispatchEvent(new MouseEvent('click',{bubbles:true}));return 'small:'+small.textContent.slice(0,30);}
      return 'none, total:'+btns.length;
    })()`,
    returnByValue: true,
  });
  console.log('[4] 포트 클릭:', portClick?.result?.value);
  await sleep(1500);
  await screenshot('05_port');

  // 이동 버튼
  const move = await clickText('이동');
  console.log('[5] 이동:', move);
  await sleep(1500);
  await screenshot('06_move');

  // 교역
  const trade = await clickText('교역');
  console.log('[6] 교역:', trade);
  await sleep(1500);
  await screenshot('07_trade');

  console.log('\n자동 플레이 완료');
  ws.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
