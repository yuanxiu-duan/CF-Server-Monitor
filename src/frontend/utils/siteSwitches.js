/**
 * 站点展示开关（价格 / 到期时间 / 流量 / 三网详情）。
 *
 * 语义：后台没有显式开启时一律按「关闭」处理（fail-closed）。
 * 原因：这些开关以前在多个前端默认值里被写成 true（`show_price: true`、`?? true`），
 * 只要 /api/servers 请求失败（未登录 / 私有站点 401 / CORS / 网络错误）、
 * 或者多站点聚合时某个站点没返回 sysConfig，访客就会看到后台已经关闭的内容
 * （典型表现：后台取消勾选「显示价格」后，未登录访客仍能看到价格与剩余价值）。
 */

export const SITE_SWITCH_KEYS = Object.freeze([
  'show_price',
  'show_expire',
  'show_tf',
  'show_three_net_details'
])

export const DEFAULT_SITE_SWITCHES = Object.freeze(
  Object.fromEntries(SITE_SWITCH_KEYS.map(key => [key, false]))
)

// 兼容 'true' / 'false' 字符串（后台写入的是字符串）、布尔值、数字 0/1。
export const normalizeSiteSwitch = (value) => {
  if (value === true || value === 1) return true
  if (value === false || value === 0 || value === null || value === undefined) return false
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase())
}

const hasSiteSwitch = (source, key) => (
  Boolean(source) &&
  typeof source === 'object' &&
  source[key] !== undefined &&
  source[key] !== null
)

export const hasAnySiteSwitch = (source) => (
  SITE_SWITCH_KEYS.some(key => hasSiteSwitch(source, key))
)

/**
 * 单个站点：显式给出了值就用它，缺失即关闭。
 */
export const resolveSiteSwitches = (source) => {
  const result = { ...DEFAULT_SITE_SWITCHES }
  if (!source || typeof source !== 'object') return result

  for (const key of SITE_SWITCH_KEYS) {
    if (hasSiteSwitch(source, key)) {
      result[key] = normalizeSiteSwitch(source[key])
    }
  }

  return result
}

/**
 * 多站点聚合：任一站点关闭即关闭，未表态的站点不影响结果。
 * 避免聚合了别人的监控站后，对方站点的开关把本站「不展示」的设置顶掉。
 */
export const aggregateSiteSwitches = (sources) => {
  const result = { ...DEFAULT_SITE_SWITCHES }
  const seen = new Set()

  for (const source of Array.isArray(sources) ? sources : []) {
    if (!source || typeof source !== 'object') continue

    for (const key of SITE_SWITCH_KEYS) {
      if (!hasSiteSwitch(source, key)) continue

      const value = normalizeSiteSwitch(source[key])
      result[key] = seen.has(key) ? (result[key] && value) : value
      seen.add(key)
    }
  }

  return result
}

export default { SITE_SWITCH_KEYS, DEFAULT_SITE_SWITCHES, normalizeSiteSwitch, hasAnySiteSwitch, resolveSiteSwitches, aggregateSiteSwitches }
