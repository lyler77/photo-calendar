export function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function buildMonthGrid(year, month) {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()

  let offset = first.getDay() - 1
  if (offset < 0) offset = 6

  const cells = []
  for (let i = 0; i < offset; i++) {
    cells.push({ type: 'empty' })
  }
  const today = new Date()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    cells.push({
      type: 'day',
      day: d,
      dateKey: formatDateKey(year, month, d),
      isToday: isSameDay(date, today)
    })
  }
  return cells
}

export function prevMonth(year, month) {
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

export function nextMonth(year, month) {
  if (month === 12) return { year: year + 1, month: 1 }
  return { year, month: month + 1 }
}