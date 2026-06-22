// Live countdown GIF for embedding in HTML emails.
// Renders a fresh animated GIF on each request based on the current time, so the
// countdown is correct whenever the email is opened. Email clients can't run JS,
// but they can show an animated GIF — this is the only way to get a "live" timer
// inside an email. Outlook shows only the first frame (still correct, just static).
//
// Usage in email:
//   <img src="https://<app>.vercel.app/api/countdown.gif" width="600" alt="Countdown">
// Optional query params:
//   ?to=2026-07-01T11:00:00Z   target instant (UTC ISO); default = the defence
//   &frames=30                 number of 1-second frames (default 30, max 60)

const { createCanvas } = require('@napi-rs/canvas');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

// Defence: 2026-07-01 13:00 Europe/Amsterdam (CEST, UTC+2) = 11:00:00 UTC
const DEFAULT_TARGET = Date.UTC(2026, 6, 1, 11, 0, 0);

// Theme tokens (match the invitation emails)
const C = {
  bgTop: '#235539', bg: '#1f4d2e', bgBot: '#163a22',
  panel: '#faf8f3', card: '#ede4c9', cardEdge: '#e0d6b8',
  forest: '#1f4d2e', sage: '#8fb872', sageLight: '#a3c585',
  terra: '#a82c2c', ink: '#2a2a2a', gold: '#c8a24a', cream: '#e7e0cb'
};

const W = 600, H = 200;

function pad(n) { return (n < 10 ? '0' : '') + n; }

// draw centred text with a fixed pixel gap between letters
function drawSpaced(ctx, text, cx, y, gap) {
  const chars = text.split('');
  const widths = chars.map(c => ctx.measureText(c).width);
  let total = gap * (chars.length - 1);
  for (const w of widths) total += w;
  let x = cx - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y);
    x += widths[i] + gap;
  }
  ctx.textAlign = prev;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFrame(ctx, parts, done) {
  // background gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.bgTop); g.addColorStop(0.55, C.bg); g.addColorStop(1, C.bgBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // faint petri-dish ring signature
  ctx.strokeStyle = 'rgba(163,197,133,0.22)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(163,197,133,0.14)';
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 178, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // eyebrow
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.sageLight;
  ctx.font = '12px Georgia, serif';
  drawSpaced(ctx, 'COUNTDOWN TO DR. HYLKE', W / 2, 34, 3);

  if (done) {
    ctx.fillStyle = C.gold;
    ctx.font = 'italic 42px Georgia, serif';
    ctx.fillText("It's defence day!", W / 2, H / 2 + 6);
    ctx.fillStyle = C.cream;
    ctx.font = '15px Georgia, serif';
    ctx.fillText('Wednesday 1 July 2026 \u00b7 Wageningen', W / 2, H / 2 + 36);
    return;
  }

  // four tiles
  const labels = ['DAYS', 'HOURS', 'MINUTES', 'SECONDS'];
  const tileW = 124, tileH = 96, gap = 16;
  const totalW = tileW * 4 + gap * 3;
  let x = (W - totalW) / 2;
  const y = 60;

  for (let i = 0; i < 4; i++) {
    // card
    const cg = ctx.createLinearGradient(0, y, 0, y + tileH);
    cg.addColorStop(0, C.panel); cg.addColorStop(1, C.cardEdge);
    ctx.fillStyle = cg;
    roundRect(ctx, x, y, tileW, tileH, 12); ctx.fill();
    // centre hairline
    ctx.strokeStyle = 'rgba(31,77,46,0.10)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 6, y + tileH / 2); ctx.lineTo(x + tileW - 6, y + tileH / 2); ctx.stroke();

    // number
    ctx.fillStyle = C.forest;
    ctx.font = '46px Georgia, serif';
    ctx.fillText(parts[i], x + tileW / 2, y + 50);
    // label (manual even letter-spacing for a clean, kerned look)
    ctx.fillStyle = C.terra;
    ctx.font = '10px Georgia, serif';
    drawSpaced(ctx, labels[i], x + tileW / 2, y + tileH - 14, 2.5);

    x += tileW + gap;
  }

  // footer line
  ctx.fillStyle = C.cream;
  ctx.font = '13px Georgia, serif';
  ctx.fillText('Wednesday 1 July 2026, 13:00 \u00b7 Omnia, Wageningen', W / 2, H - 16);
}

function partsFor(diffMs) {
  if (diffMs <= 0) return null;
  let sec = Math.floor(diffMs / 1000);
  const days = Math.floor(sec / 86400);
  const hrs = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  return [pad(days), pad(hrs), pad(mins), pad(secs)];
}

module.exports = (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const toParam = url.searchParams.get('to');
    let target = DEFAULT_TARGET;
    if (toParam) {
      const t = Date.parse(toParam);
      if (!isNaN(t)) target = t;
    }
    let frames = parseInt(url.searchParams.get('frames') || '30', 10);
    if (isNaN(frames) || frames < 1) frames = 30;
    if (frames > 60) frames = 60;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    const enc = GIFEncoder();
    const now = Date.now();

    for (let f = 0; f < frames; f++) {
      const diff = target - (now + f * 1000);
      const parts = partsFor(diff);
      drawFrame(ctx, parts || ['00', '00', '00', '00'], parts === null);
      const { data } = ctx.getImageData(0, 0, W, H);
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);
      enc.writeFrame(index, W, H, { palette, delay: 1000 });
      if (parts === null) break; // once done, one celebratory frame is enough
    }
    enc.finish();
    const buf = Buffer.from(enc.bytes());

    res.setHeader('Content-Type', 'image/gif');
    // never cache: each open should re-render the current countdown
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.statusCode = 200;
    res.end(buf);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('countdown error: ' + (err && err.message ? err.message : 'unknown'));
  }
};
