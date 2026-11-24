export async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch (e) {
      // 落到 img 路径
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = () => rej(new Error('图片解码失败，可能是 HEIC 或格式不支持'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function compressImage(file, maxSide = 2000) {
  const src = await loadBitmap(file)
  const w0 = src.width || src.naturalWidth
  const h0 = src.height || src.naturalHeight
  const scale = Math.min(1, maxSide / Math.max(w0, h0))
  const w = Math.max(1, Math.round(w0 * scale))
  const h = Math.max(1, Math.round(h0 * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(src, 0, 0, w, h)

  const blob = await new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob 失败'))), 'image/jpeg', 0.85)
  )
  if (src.close) src.close()
  return { blob, width: w, height: h }
}