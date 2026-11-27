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
  let canvas
  try {
    const w0 = src.width || src.naturalWidth
    const h0 = src.height || src.naturalHeight
    if (!w0 || !h0) throw new Error('无法读取图片尺寸')

    const scale = Math.min(1, maxSide / Math.max(w0, h0))
    const w = Math.max(1, Math.round(w0 * scale))
    const h = Math.max(1, Math.round(h0 * scale))

    canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法处理图片')
    context.drawImage(src, 0, 0, w, h)

    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('图片压缩失败')), 'image/jpeg', 0.85)
    )
    return { blob, width: w, height: h }
  } finally {
    if (src.close) src.close()
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }
}
