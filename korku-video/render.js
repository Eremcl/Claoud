// Kullanım: node render.js            -> arkana-bakma.mp4 (audio.wav gerekir)
//          node render.js still 450 870 -> belirli kareleri PNG olarak kaydeder
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

(async () => {
  const dir = __dirname;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(dir, 'scene.html'));
  const total = await page.evaluate(() => window.TOTAL);

  if (process.argv[2] === 'still') {
    const out = process.argv[3];
    for (const n of process.argv.slice(4).map(Number)) {
      await page.evaluate(n => window.renderFrame(n), n);
      await page.screenshot({ path: path.join(out, `f${String(n).padStart(4, '0')}.png`) });
    }
    await browser.close();
    return;
  }

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(dir, 'audio.wav'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', path.join(dir, 'arkana-bakma.mp4')],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let n = 0; n < total; n++) {
    await page.evaluate(n => window.renderFrame(n), n);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (n % 150 === 0) console.log(`kare ${n}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('tamam');
})();
