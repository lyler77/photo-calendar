import { buildMonthGrid } from './useCalendar'

const W = 1080
const H = 1440
const SCALE = 2

export async function renderMonth({
  year,
  month,
  cells,
  photos,
  style,
  template,
  filterCss
}) {
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  await drawBackground(ctx, style, template, W, H)

  const hasBg = !!style.backgroundImageBlob
  const textColor = hasBg ? '#ffffff' : template.textColor
  const subTextColor = hasBg ? 'rgba(255,255,255,0.7)' : template.weekLabelColor

  // 1. 标题位置固定下调一点
  ctx.fillStyle = textColor
  ctx.font = '600 56px -apple-system, "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${year} 年 ${month} 月`, W / 2, 150)

  const pad = 60
  const cols = 7
  const cellTotalW = (W - pad * 2) / cols
  const gap = 8
  const cellW = cellTotalW - gap
  const cellH = cellW
  
  // 2. 星期和网格紧凑跟随标题
  const weekTop = 250
  const gridTop = 290

  const weekLabels = ['一', '二', '三', '四', '五', '六', '日']

  ctx.fillStyle = subTextColor
  ctx.font = '28px -apple-system, "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  weekLabels.forEach((w, i) => {
    ctx.fillText(w, pad + cellTotalW * i + cellTotalW / 2, weekTop)
  })

  const bitmaps = await loadBitmapsForMonth(year, month, photos)

  await drawMonthGrid(ctx, {
    x: pad,
    y: gridTop,
    w: W - pad * 2,
    cells,
    bitmaps,
    template,
    hasBg,
    filterCss,
    isYearView: false
  })

  Object.values(bitmaps).forEach(b => b.close?.())

  // 3. 底部落款永远固定在底部
  ctx.fillStyle = subTextColor
  ctx.font = '24px -apple-system, "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('照片月历', W / 2, H - 60)

  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92))
  if (!blob) throw new Error('导出失败，请重试')
  return { blob, width: W * SCALE, height: H * SCALE }
}

export async function renderYear({
  year,
  photos,
  style,
  template,
  filterCss,
  layout // 'h' 横版 4x3, 'v' 竖版 3x4
}) {
  const isH = layout === 'h'
  const W = isH ? 2400 : 1800
  const H = isH ? 1800 : 2400

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  await drawBackground(ctx, style, template, W, H)
  const hasBg = !!style.backgroundImageBlob
  const textColor = hasBg ? '#ffffff' : template.textColor

  ctx.fillStyle = textColor
  ctx.font = '600 72px -apple-system, "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${year} 年 照片月历`, W / 2, 80)

  const cols = isH ? 4 : 3
  const rows = isH ? 3 : 4
  const gap = 40
  const padTop = 140
  const padX = 40
  const cardW = (W - padX * 2 - gap * (cols - 1)) / cols
  const cardH = (H - padTop - 40 - gap * (rows - 1)) / rows

  for (let m = 1; m <= 12; m++) {
    const col = (m - 1) % cols
    const row = Math.floor((m - 1) / cols)
    const x = padX + col * (cardW + gap)
    const y = padTop + row * (cardH + gap)

    // 画月份背景卡片
    ctx.fillStyle = hasBg ? 'rgba(0,0,0,0.3)' : (style.backgroundColor === '#ffffff' ? '#fcfcfc' : style.backgroundColor)
    ctx.fillRect(x, y, cardW, cardH)

    ctx.fillStyle = textColor
    ctx.font = '600 32px -apple-system, "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(`${m} 月`, x + cardW / 2, y + 16)

    // 获取当月数据
    const yearData = buildMonthGrid(year, m)
    const bitmaps = await loadBitmapsForMonth(year, m, photos)

    // 绘制单月网格，隐藏星期标签以节省空间
    await drawMonthGrid(ctx, {
      x: x + 16,
      y: y + 60,
      w: cardW - 32,
      cells: yearData,
      bitmaps,
      template,
      hasBg,
      filterCss,
      isYearView: true // 全年视图不画星期标签
    })

    Object.values(bitmaps).forEach(b => b.close?.())
  }

  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92))
  if (!blob) throw new Error('导出失败，请重试')
  return { blob, width: W, height: H }
}

// --- 辅助绘制方法 ---

async function drawBackground(ctx, style, template, w, h) {
  const hasBg = !!style.backgroundImageBlob
  if (hasBg) {
    try {
      const bgBmp = await createImageBitmap(style.backgroundImageBlob)
      drawCover(ctx, bgBmp, 0, 0, w, h)
      bgBmp.close()
    } catch (e) {}
    ctx.fillStyle = `rgba(0, 0, 0, ${style.backgroundOverlayOpacity || 0.5})`
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.fillStyle = style.backgroundColor || template.backgroundColor
    ctx.fillRect(0, 0, w, h)
  }
}

async function loadBitmapsForMonth(year, month, photos) {
  const bitmaps = {}
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  await Promise.all(
    Object.entries(photos)
      .filter(([key]) => key.startsWith(prefix))
      .map(async ([key, p]) => {
        try { bitmaps[key] = await createImageBitmap(p.blob) } catch (e) {}
      })
  )
  return bitmaps
}

async function drawMonthGrid(ctx, {
  x, y, w, cells, bitmaps, template, hasBg, filterCss, isYearView
}) {
  const cols = 7
  const cellTotalW = w / cols
  const gap = isYearView ? 2 : 8
  const cellW = cellTotalW - gap
  const cellH = cellW

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    if (cell.type === 'empty') continue

    const col = i % 7
    const row = Math.floor(i / 7)
    const cx = x + col * cellTotalW + gap / 2
    const cy = y + row * (cellH + gap)
    const hasPhoto = !!bitmaps[cell.dateKey]

    if (hasBg && !hasPhoto) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.fillRect(cx, cy, cellW, cellH)
    } else {
      ctx.fillStyle = isYearView ? '#ffffff' : (hasBg ? 'rgba(255,255,255,0.9)' : '#ffffff')
      ctx.fillRect(cx, cy, cellW, cellH)
    }

    // 边框
    if (!isYearView) {
      if (cell.isToday) {
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 3
        ctx.strokeRect(cx + 1.5, cy + 1.5, cellW - 3, cellH - 3)
      } else if (!hasBg || hasPhoto) {
        ctx.strokeStyle = template.cellBorderColor
        ctx.lineWidth = 1
        ctx.strokeRect(cx + 0.5, cy + 0.5, cellW - 1, cellH - 1)
      }
    }

    if (hasPhoto) {
      const bmp = bitmaps[cell.dateKey]
      ctx.save()
      ctx.beginPath()
      ctx.rect(cx, cy, cellW, cellH)
      ctx.clip()
      if (filterCss && filterCss !== 'none') { ctx.filter = filterCss }
      drawCover(ctx, bmp, cx, cy, cellW, cellH)
      ctx.restore()
    }

    // 画日期数字
    if (!isYearView) {
      ctx.font = '20px -apple-system, "PingFang SC", sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      if (hasPhoto) {
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = 'rgba(0,0,0,0.65)'
        ctx.shadowBlur = 4
      } else if (hasBg) {
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = 'rgba(0,0,0,0.5)'
        ctx.shadowBlur = 2
      } else {
        ctx.fillStyle = template.textColor
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }
      ctx.fillText(String(cell.day), cx + 8, cy + 6)
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    }
  }
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