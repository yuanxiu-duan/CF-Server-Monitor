// 展示开关（show_price / show_expire）在数据层做 fail-closed 兜底。
//
// 背景：后台关闭「价格展示」后，前端虽然按开关隐藏了价格，但 /api/servers、/api/server
// 仍然把 price / currency / billing_cycle / auto_renewal 返回给未登录访客；第三方主题
// （例如 LuminaPlus）只读自己的主题选项、不读 show_price，于是依旧把价格渲染出来。
// 这里在返回给访客前直接删掉这些字段，任何主题/前端都无法显示后台已关闭的价格。

export const BILLING_DISPLAY_FIELDS = ['price', 'currency', 'billing_cycle', 'auto_renewal'];

// 主题选项中与价格/成本展示相关的开关：站点关闭价格展示时，对访客一并关闭。
export const PRICE_RELATED_THEME_OPTIONS = ['showCardPrice', 'showAssetOverview', 'showCostSummary'];

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 按站点开关裁剪服务器对象中面向访客的展示字段。
 * 登录后台不受影响，始终保留完整字段用于维护。
 */
export function applyDisplaySwitchPrivacy(server, { isLoggedIn = false, sys = null } = {}) {
  if (!isRecord(server)) return server;
  if (isLoggedIn) return server;

  const showPrice = sys?.show_price === 'true';
  const showExpire = sys?.show_expire === 'true';
  if (showPrice && showExpire) return server;

  const item = { ...server };
  if (!showPrice) {
    for (const field of BILLING_DISPLAY_FIELDS) {
      delete item[field];
    }
  }
  if (!showExpire) {
    delete item.expire_date;
  }
  return item;
}

/**
 * 站点关闭价格展示时，把价格/成本相关的主题选项对访客置为关闭。
 * 只影响接口返回，不改动数据库里管理员保存的主题选项。
 */
export function applyDisplaySwitchPrivacyToThemeOptions(themeOptions, { isLoggedIn = false, sys = null } = {}) {
  const options = isRecord(themeOptions) ? themeOptions : {};
  if (isLoggedIn) return options;
  if (sys?.show_price === 'true') return options;

  const hidden = { ...options };
  let changed = false;
  for (const key of PRICE_RELATED_THEME_OPTIONS) {
    if (hidden[key] !== false) {
      hidden[key] = false;
      changed = true;
    }
  }
  return changed ? hidden : options;
}
