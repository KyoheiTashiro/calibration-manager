// マニュアル画面の解説動画(public/manual/explainer-video.mp4 と .vtt)を index.html から作り直す。
//
// 前提: node 22 以上、ffmpeg、Google Chrome、VOICEVOX エンジン(四国めたん ノーマル = speaker 2)
//   docker run -d --name voicevox -p 127.0.0.1:50021:50021 voicevox/voicevox_engine:cpu-latest
// 使い方(このディレクトリで):
//   node build.mjs --dry   読み上げ原稿と VOICEVOX の読み(カナ)を出すだけ。読み違いは readings.json に足す
//   node build.mjs         音声合成 → 時間割 → 1 コマずつ撮影 → mp4 と vtt を public/manual/ に書き出す
// 絵と字幕は index.html の SCENES を直す。ブラウザーで開けばそのまま確認できる(#t秒 で時刻指定)。
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const HERE = import.meta.dirname;
const OUT = path.join(HERE, '../../public/manual/explainer-video');
const VV = 'http://127.0.0.1:50021', SPEAKER = 2, RATE = 48000, FPS = 30, WORKERS = 4;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DRY = process.argv.includes('--dry');

const html = fs.readFileSync(path.join(HERE, 'index.html'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(html.match(/<script id="scenes">([\s\S]*?)<\/script>/)[1] + ';this.S=SCENES', ctx);
const scenes = ctx.S.map(sc => ({
  name: sc.name,
  cues: sc.cues.map(q => (typeof q === 'string' ? { s: q, hold: 0 } : { s: q.s, hold: q.hold || 0 })),
}));

// 読み替え。素材固有の語は readings.json で置き換える。日付は年月日に直し、空白は間として読まれるので取り除く
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rules = [
  ...JSON.parse(fs.readFileSync(path.join(HERE, 'readings.json'), 'utf8')).map(([a, b]) => [new RegExp(esc(a), 'g'), b]),
  [/(\d{4})[-/](\d\d)[-/](\d\d)/g, (_, y, m, d) => `${y}年${+m}月${+d}日`],
  [/\s+/g, ''],
];
const reading = s => rules.reduce((r, [a, b]) => r.replace(a, b), s);

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  if (!res.ok) throw new Error(`VOICEVOX ${res.status}: ${await res.text()}`);
  return res;
}
// 戻り値は 48kHz モノラル 16bit の PCM。dry のときは読みを表示するだけ
async function speak(text) {
  const read = reading(text);
  const q = await (await post(`${VV}/audio_query?speaker=${SPEAKER}&text=${encodeURIComponent(read)}`)).json();
  if (DRY) { console.log(`${text}\n  → ${read}\n  → ${q.kana}`); return new Int16Array(0); }
  Object.assign(q, { speedScale: 1, outputSamplingRate: RATE, outputStereo: false });
  const wav = Buffer.from(await (await post(`${VV}/synthesis?speaker=${SPEAKER}`, JSON.stringify(q))).arrayBuffer());
  const at = wav.indexOf('data', 12) + 8;
  return new Int16Array(wav.buffer, wav.byteOffset + at, wav.readUInt32LE(at - 4) >> 1);
}

// 時間割。index.html の BUILT と同じ式で並べる(章タイトル → 0.6 秒 → 字幕 → 0.9 秒)
const clips = [], vtt = [], CUE_DURS = [], TITLE_DURS = [];
let start = 0;
for (const sc of scenes) {
  const tp = await speak(sc.name);
  const title = Math.max(2.4, 0.5 + tp.length / RATE + 0.7);
  clips.push([start + 0.5, tp]);
  vtt.push([start + 0.5, start + title, sc.name]);
  let t = start + title + 0.6;
  const durs = [];
  for (const [i, q] of sc.cues.entries()) {
    const pcm = await speak(q.s);
    const base = Math.max(3.4, 1.4 + q.s.replace(/\s/g, '').length * 0.13);
    const d = Math.max(base, pcm.length / RATE + 0.7) + q.hold;
    clips.push([t, pcm]);
    vtt.push([t, i === sc.cues.length - 1 ? t + d + 0.55 : t + d, q.s]);
    durs.push(d);
    t += d;
  }
  TITLE_DURS.push(title);
  CUE_DURS.push(durs);
  start = t + 0.9;
}
if (DRY) process.exit(0);
const total = start, frames = Math.round(total * FPS);
console.log(`全長 ${total.toFixed(2)} 秒 / ${frames} コマ`);

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'explainer-video-'));
const track = new Int16Array(Math.ceil(total * RATE));
for (const [t, pcm] of clips) track.set(pcm, Math.round(t * RATE));
const head = Buffer.alloc(44);
head.write('RIFF'); head.writeUInt32LE(36 + track.byteLength, 4); head.write('WAVEfmt ', 8);
head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
head.write('data', 36); head.writeUInt32LE(track.byteLength, 40);
fs.writeFileSync(path.join(work, 'track.wav'), Buffer.concat([head, Buffer.from(track.buffer)]));

const ts = v => new Date(Math.round(v * 1000)).toISOString().slice(11, 23);
fs.writeFileSync(`${OUT}.vtt`, 'WEBVTT\n\n' + vtt.map(([a, b, s]) => `${ts(a)} --> ${ts(b)}\n${s}\n`).join('\n'));

// 撮影用のページ: 操作パネルを消して舞台を全面にし、音声に合わせた秒数を渡す
const CSS = '<style>.wrap{max-width:none!important;padding:0!important;gap:0!important}header,.controls,.chapters,.note,.big-play{display:none!important}.frame{border-radius:0!important}.cap{font-size:2.2cqw!important}</style>';
const page = path.join(work, 'render.html');
fs.writeFileSync(page, html.replace('</head>', CSS + '</head>')
  .replace('<script id="scenes">', `<script>const CUE_DURS=${JSON.stringify(CUE_DURS)},TITLE_DURS=${JSON.stringify(TITLE_DURS)};</script><script id="scenes">`));

const sleep = ms => new Promise(r => setTimeout(r, ms));
// ヘッドレス Chrome を DevTools プロトコルで動かし、f0 から f1 の手前までを 1 コマずつ撮って ffmpeg に流す
async function record(k, f0, f1) {
  const port = 9341 + k, out = path.join(work, `seg${k}.mp4`);
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(work, 'prof' + k)}`, '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
  try {
    let tab;
    for (let i = 0; i < 200 && !tab; i++) {
      await sleep(300);
      tab = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json()).then(l => l.find(x => x.type === 'page'), () => null);
    }
    if (!tab) throw new Error('Chrome の起動を確認できません');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });
    let id = 0;
    const pend = new Map();
    ws.onmessage = ev => { const m = JSON.parse(ev.data); pend.get(m.id)?.(m); pend.delete(m.id); };
    const send = (method, params = {}) => new Promise(r => { pend.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
    await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'file://' + page });
    await sleep(1500);
    await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>1)', awaitPromise: true });
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', FPS, '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', FPS, out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = f0; f < f1; f++) {
      await send('Runtime.evaluate', { expression: `__explainer.render(${(f / FPS).toFixed(4)})` });
      const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
      if (!ff.stdin.write(Buffer.from(r.result.data, 'base64'))) await new Promise(res => ff.stdin.once('drain', res));
      if ((f - f0) % 900 === 0) console.log(`[${k}] ${f - f0} / ${f1 - f0}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    ws.close();
    return out;
  } finally { chrome.kill(); }
}
const per = Math.ceil(frames / WORKERS);
const segs = await Promise.all(Array.from({ length: WORKERS }, (_, k) => record(k, k * per, Math.min(frames, (k + 1) * per))));
fs.writeFileSync(path.join(work, 'list.txt'), segs.map(s => `file '${s}'\n`).join(''));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'list.txt'), '-i', path.join(work, 'track.wav'),
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', RATE, '-movflags', '+faststart', '-shortest', `${OUT}.mp4`], { stdio: 'inherit' });
fs.rmSync(work, { recursive: true });
console.log(`書き出し: ${OUT}.mp4 / .vtt`);
