// gen_bgm.js — Pioneer 데모용 배경음악 WAV 생성 스크립트
// 용도: A minor pentatonic 해양 무역 분위기 BGM, 8초 루프(실제 26.67초 구조)
// 실행: node C:\Development\2_Pioneer\gen_bgm.js

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const BPM = 72;
const BEAT = 60 / BPM; // 0.8333초
const BARS = 8;
const DURATION = BARS * 4 * BEAT; // 26.667초
const NUM_SAMPLES = Math.round(DURATION * SAMPLE_RATE);

// A minor pentatonic 음 (Hz)
const NOTE = {
  A2: 110.00,
  D3: 146.83,
  E3: 164.81,
  G3: 196.00,
  A3: 220.00,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.00,
  A4: 440.00,
};

const mix = new Float32Array(NUM_SAMPLES);

// --- Melody: addSine (sine + slight triangle harmonic) ---
function addMelodyNote(freq, startSec, durSec, vol) {
  const attackSec = 0.015;
  const releaseSec = durSec * 0.4;
  const start = Math.round(startSec * SAMPLE_RATE);
  const end = Math.min(NUM_SAMPLES, Math.round((startSec + durSec) * SAMPLE_RATE));
  const attackSamples = Math.round(attackSec * SAMPLE_RATE);
  const releaseSamples = Math.round(releaseSec * SAMPLE_RATE);
  const totalSamples = end - start;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    let env;
    if (i < attackSamples) {
      env = i / attackSamples;
    } else if (i > totalSamples - releaseSamples) {
      env = (totalSamples - i) / Math.max(1, releaseSamples);
    } else {
      env = 1.0;
    }
    // sine + triangle 3rd harmonic (volume 0.15)
    const sine = Math.sin(2 * Math.PI * freq * t);
    // 삼각파 근사: 기본 + 3배음
    const tri = Math.sin(2 * Math.PI * freq * 3 * t) * 0.15;
    const sample = (sine + tri) * vol * env;
    const idx = start + i;
    mix[idx] = Math.min(1, Math.max(-1, mix[idx] + sample));
  }
}

// --- Bass: addSine (pure sine) ---
function addBassNote(freq, startSec, durSec, vol) {
  const attackSec = 0.03;
  const releaseSec = durSec * 0.3;
  const start = Math.round(startSec * SAMPLE_RATE);
  const end = Math.min(NUM_SAMPLES, Math.round((startSec + durSec) * SAMPLE_RATE));
  const attackSamples = Math.round(attackSec * SAMPLE_RATE);
  const releaseSamples = Math.round(releaseSec * SAMPLE_RATE);
  const totalSamples = end - start;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    let env;
    if (i < attackSamples) {
      env = i / attackSamples;
    } else if (i > totalSamples - releaseSamples) {
      env = (totalSamples - i) / Math.max(1, releaseSamples);
    } else {
      env = 1.0;
    }
    const sample = Math.sin(2 * Math.PI * freq * t) * vol * env;
    const idx = start + i;
    mix[idx] = Math.min(1, Math.max(-1, mix[idx] + sample));
  }
}

// ============================================================
// Melody: 32 quarter notes (bars 1-8, 4 beats each)
// ============================================================
const melodyNotes = [
  // bars 1-4
  NOTE.E4, NOTE.G4, NOTE.A4, NOTE.G4,
  NOTE.E4, NOTE.D4, NOTE.C4, NOTE.A3,
  NOTE.A3, NOTE.C4, NOTE.E4, NOTE.G4,
  NOTE.E4, NOTE.D4, NOTE.A3, NOTE.A3,
  // bars 5-8
  NOTE.E4, NOTE.G4, NOTE.A4, NOTE.A4,
  NOTE.G4, NOTE.E4, NOTE.D4, NOTE.C4,
  NOTE.D4, NOTE.E4, NOTE.G4, NOTE.E4,
  NOTE.D4, NOTE.C4, NOTE.A3, NOTE.A3,
];

const noteDur = BEAT; // quarter note duration
const melodyVol = 0.38;

for (let i = 0; i < melodyNotes.length; i++) {
  const startSec = i * BEAT;
  addMelodyNote(melodyNotes[i], startSec, noteDur, melodyVol);
}

// ============================================================
// Bass: half notes (BEAT*2), root changes every 2 bars
// bars 1-2: A2, E3 / bars 3-4: D3, A2 / bars 5-6: A2, E3 / bars 7-8: G3, A2
// ============================================================
const halfDur = BEAT * 2;
const bassVol = 0.32;

const bassSequence = [
  // bars 1-2 (beats 0-7): A2 for 2 beats(half), E3 for 2 beats... actually half note = 2 beats
  // each "bar" = 4 beats, each bass note = half note = 2 beats
  // bars 1: beats 0-1 = A2, beats 2-3 = A2 (sustain same) → actually 1 half per bar pair
  // Spec: bars 1-2: A2, E3 (one half note each bar)
  { freq: NOTE.A2, beat: 0 },   // bar 1, beat 0
  { freq: NOTE.A2, beat: 2 },   // bar 1, beat 2
  { freq: NOTE.E3, beat: 4 },   // bar 2, beat 0
  { freq: NOTE.E3, beat: 6 },   // bar 2, beat 2
  { freq: NOTE.D3, beat: 8 },   // bar 3, beat 0
  { freq: NOTE.D3, beat: 10 },  // bar 3, beat 2
  { freq: NOTE.A2, beat: 12 },  // bar 4, beat 0
  { freq: NOTE.A2, beat: 14 },  // bar 4, beat 2
  { freq: NOTE.A2, beat: 16 },  // bar 5
  { freq: NOTE.A2, beat: 18 },
  { freq: NOTE.E3, beat: 20 },  // bar 6
  { freq: NOTE.E3, beat: 22 },
  { freq: NOTE.G3, beat: 24 },  // bar 7
  { freq: NOTE.G3, beat: 26 },
  { freq: NOTE.A2, beat: 28 },  // bar 8
  { freq: NOTE.A2, beat: 30 },
];

for (const b of bassSequence) {
  addBassNote(b.freq, b.beat * BEAT, halfDur, bassVol);
}

// ============================================================
// Pink Noise (ocean ambience), volume 0.025
// ============================================================
let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
for (let i = 0; i < NUM_SAMPLES; i++) {
  const w = Math.random() * 2 - 1;
  b0 = 0.99886 * b0 + w * 0.0555179;
  b1 = 0.99332 * b1 + w * 0.0750759;
  b2 = 0.96900 * b2 + w * 0.1538520;
  b3 = 0.86650 * b3 + w * 0.3104856;
  b4 = 0.55000 * b4 + w * 0.5329522;
  b5 = -0.7616  * b5 - w * 0.0168980;
  const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
  b6 = w * 0.115926;
  mix[i] = Math.min(1, Math.max(-1, mix[i] + pink * 0.025));
}

// ============================================================
// WAV 파일 저장
// ============================================================
function writeWav(samples, sampleRate, filename) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);        // fmt chunk size
  buf.writeUInt16LE(1, 20);         // PCM
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filename, buf);
  const sizeKB = (buf.length / 1024).toFixed(1);
  const durationSec = (samples.length / sampleRate).toFixed(2);
  console.log(`Written: ${filename}`);
  console.log(`  Size   : ${sizeKB} KB`);
  console.log(`  Duration: ${durationSec} sec`);
  console.log(`  Samples : ${samples.length}`);
}

// 앞 8초만 추출하여 저장 (700KB 이하 유지)
const LOOP_SAMPLES = Math.round(8.0 * SAMPLE_RATE); // 352,800 샘플
const loopMix = mix.slice(0, LOOP_SAMPLES);

// 출력 경로 확인 및 생성
const outDir = path.join('C:', 'Development', '2_Pioneer', 'src', 'assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'bgm_demo.wav');
writeWav(loopMix, SAMPLE_RATE, outPath);
