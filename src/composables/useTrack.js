export function track(eventName, params = {}) {
  // MVP 阶段：先打印在控制台，或者在本地 localStorage 存一份
  // 后续接真实统计时，只需把这里替换为请求 API，或者接入百度统计/GA
  console.log(`[Track] ${eventName}`, { ...params, time: Date.now() })
}