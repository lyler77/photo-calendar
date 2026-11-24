const W = 1080
const H = 1440
const SCALE = 2

export async function renderMonthSample(bitmap, date = new Date()) {
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#111'
  ctx.font = '600 48px -apple-system, "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${date.getFullYear()} 年 ${date.getMonth() + 1} 月`, W / 2, 110)

  const pad = 60
  const gridTop = 180
  const cols = 7
  const cellW = (W - pad * 2) / cols
  const cellH = cellW

  const week = ['一', '二', '三', '四', '五', '六', '日']
  ctx.font = '24px -apple-system, "PingFang SC", sans-serif'
  ctx.fillStyle = '#888'
  week.forEach((w, i) => ctx.fillText(w, pad + cellW * i + cellW / 2, gridTop - 16))

  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  let offset = first.getDay() - 1
  if (offset < 0) offset = 6
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

  for (let d = 1; d <= days; d++) {
    const idx = offset + d - 1
    const x = pad + (idx % 7) * cellW
    const y = gridTop + Math.floor(idx / 7) * cellH

    ctx.strokeStyle = '#eee'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4)

    if (d === date.getDate() && bitmap) {
      drawCover(ctx, bitmap, x + 2, y + 2, cellW - 4, cellH - 4)
    }

    ctx.fillStyle = '#333'
    ctx.font = '20px -apple-system, "PingFang SC", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(String(d), x + 8, y + 26)
  }

  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92))
  return { blob, width: W * SCALE, height: H * SCALE }
}

function drawCover(ctx, src, x, y, w, h) {
  const sRatio = src.width / src.height
  const dRatio = w / h
  let sx, sy, sw, sh
  if (sRatio > dRatio) {
    sh = src.height
    sw = sh * dRatio
    sx = (src.width - sw) / 2
    sy = 0
  } else {
    sw = src.width
    sh = sw / dRatio
    sx = 0
    sy = (src.height - sh) / 2
  }
  ctx.drawImage(src, sx, sy, sw, sh, x, y, w, h)
}