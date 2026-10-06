import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const rate = 44100
function writeWav(name, seconds, render) {
  const frames = Math.floor(rate * seconds)
  const out = Buffer.alloc(44 + frames * 2)
  out.write('RIFF', 0); out.writeUInt32LE(36 + frames * 2, 4); out.write('WAVEfmt ', 8)
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22)
  out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34)
  out.write('data', 36); out.writeUInt32LE(frames * 2, 40)
  for (let i = 0; i < frames; i += 1) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, render(i / rate, i / frames))) * 32767), 44 + i * 2)
  const path = resolve('src/assets/sfx', name); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, out)
}
writeWav('pioneer-ui-select-v1.wav', .12, (t, p) => Math.sin(2 * Math.PI * (720 + p * 180) * t) * Math.sin(Math.PI * p) * .15)
writeWav('pioneer-trade-confirm-v1.wav', .24, (t, p) => Math.sin(2 * Math.PI * (390 + p * 340) * t) * Math.sin(Math.PI * p) * .18)
writeWav('pioneer-ship-depart-v1.wav', .38, (t, p) => (Math.sin(2 * Math.PI * (180 - p * 70) * t) + Math.sin(2 * Math.PI * 520 * t) * .18) * (1 - p) * .2)
writeWav('pioneer-event-alert-v1.wav', .28, (t, p) => (Math.sin(2 * Math.PI * 610 * t) + Math.sin(2 * Math.PI * 780 * t)) * Math.sin(Math.PI * p) * .12)
