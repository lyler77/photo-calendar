import { parse } from 'exifr'

export async function readShotTime(file) {
  try {
    const exif = await parse(file, ['DateTimeOriginal', 'DateTimeDigitized', 'CreateDate'])
    if (!exif) return null
    const d = exif.DateTimeOriginal || exif.DateTimeDigitized || exif.CreateDate
    return d instanceof Date && !isNaN(d) ? d : null
  } catch {
    return null
  }
}