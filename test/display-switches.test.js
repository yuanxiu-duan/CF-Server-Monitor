import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BILLING_DISPLAY_FIELDS,
  PRICE_RELATED_THEME_OPTIONS,
  applyDisplaySwitchPrivacy,
  applyDisplaySwitchPrivacyToThemeOptions
} from '../src/utils/displaySwitches.js';

const VISITOR = { isLoggedIn: false };

function makeServer() {
  return {
    id: 'server-1',
    name: 'tx-bj',
    price: '230.50',
    currency: '¥',
    billing_cycle: 'year',
    auto_renewal: '1',
    expire_date: '2030-12-07',
    traffic_limit: 500
  };
}

test('visitors lose every billing field while price display is off', () => {
  const server = applyDisplaySwitchPrivacy(makeServer(), {
    ...VISITOR,
    sys: { show_price: 'false', show_expire: 'true' }
  });

  for (const field of BILLING_DISPLAY_FIELDS) {
    assert.equal(Object.prototype.hasOwnProperty.call(server, field), false, `${field} must be stripped`);
  }
  assert.equal(server.expire_date, '2030-12-07');
  assert.equal(server.name, 'tx-bj');
});

test('missing or malformed show_price keeps billing fields hidden (fail-closed)', () => {
  for (const sys of [undefined, null, {}, { show_price: null }, { show_price: false }, { show_price: 1 }]) {
    const server = applyDisplaySwitchPrivacy(makeServer(), { ...VISITOR, sys });
    assert.equal(server.price, undefined);
    assert.equal(server.currency, undefined);
  }
});

test('visitors keep billing fields only when the site explicitly enables both switches', () => {
  const server = applyDisplaySwitchPrivacy(makeServer(), {
    ...VISITOR,
    sys: { show_price: 'true', show_expire: 'true' }
  });
  assert.equal(server.price, '230.50');
  assert.equal(server.expire_date, '2030-12-07');
});

test('show_expire off hides the expire date for visitors', () => {
  const server = applyDisplaySwitchPrivacy(makeServer(), {
    ...VISITOR,
    sys: { show_price: 'true', show_expire: 'false' }
  });
  assert.equal(server.price, '230.50');
  assert.equal(server.expire_date, undefined);
});

test('logged-in admins always receive the full server object', () => {
  const original = makeServer();
  for (const sys of [{ show_price: 'false', show_expire: 'false' }, undefined]) {
    const server = applyDisplaySwitchPrivacy(original, { isLoggedIn: true, sys });
    assert.deepEqual(server, original);
  }
});

test('privacy helper leaves non-object values untouched', () => {
  assert.equal(applyDisplaySwitchPrivacy(null, VISITOR), null);
  assert.equal(applyDisplaySwitchPrivacy(undefined, VISITOR), undefined);
  assert.deepEqual(applyDisplaySwitchPrivacy([], VISITOR), []);
});

test('price related theme options are forced off for visitors when price display is off', () => {
  const options = {
    showHomeOverview: true,
    showCardPrice: true,
    showAssetOverview: true,
    showCostSummary: true,
    showGroupTabs: true
  };
  const result = applyDisplaySwitchPrivacyToThemeOptions(options, {
    ...VISITOR,
    sys: { show_price: 'false' }
  });

  for (const key of PRICE_RELATED_THEME_OPTIONS) {
    assert.equal(result[key], false, `${key} must be forced off`);
  }
  assert.equal(result.showHomeOverview, true);
  assert.equal(result.showGroupTabs, true);
  // 管理员保存的原始配置不被修改
  assert.equal(options.showCardPrice, true);
});

test('theme options pass through for admins and for price-enabled sites', () => {
  const options = { showCardPrice: true, showAssetOverview: true, showCostSummary: true };
  assert.deepEqual(
    applyDisplaySwitchPrivacyToThemeOptions(options, { isLoggedIn: true, sys: { show_price: 'false' } }),
    options
  );
  assert.deepEqual(
    applyDisplaySwitchPrivacyToThemeOptions(options, { ...VISITOR, sys: { show_price: 'true' } }),
    options
  );
});

test('theme option privacy tolerates malformed input', () => {
  assert.deepEqual(applyDisplaySwitchPrivacyToThemeOptions(null, { ...VISITOR, sys: { show_price: 'false' } }), {
    showCardPrice: false,
    showAssetOverview: false,
    showCostSummary: false
  });
  assert.deepEqual(applyDisplaySwitchPrivacyToThemeOptions('nope', { ...VISITOR, sys: {} }), {
    showCardPrice: false,
    showAssetOverview: false,
    showCostSummary: false
  });
});
