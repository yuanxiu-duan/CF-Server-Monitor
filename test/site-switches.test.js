import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SITE_SWITCHES,
  SITE_SWITCH_KEYS,
  aggregateSiteSwitches,
  hasAnySiteSwitch,
  normalizeSiteSwitch,
  resolveSiteSwitches
} from '../src/frontend/utils/siteSwitches.js';

test('site switches default to closed (fail-closed)', () => {
  for (const key of SITE_SWITCH_KEYS) {
    assert.equal(DEFAULT_SITE_SWITCHES[key], false);
    assert.equal(resolveSiteSwitches(undefined)[key], false);
    assert.equal(resolveSiteSwitches({})[key], false);
    assert.equal(resolveSiteSwitches({ [key]: null })[key], false);
  }
});

test('site switches accept the values written by the admin panel', () => {
  assert.deepEqual(resolveSiteSwitches({ show_price: 'true' }), {
    show_price: true, show_expire: false, show_tf: false, show_three_net_details: false
  });
  assert.deepEqual(resolveSiteSwitches({ show_price: false, show_expire: 'false' }), {
    show_price: false, show_expire: false, show_tf: false, show_three_net_details: false
  });
  assert.deepEqual(resolveSiteSwitches({ show_tf: 1, show_three_net_details: true }), {
    show_price: false, show_expire: false, show_tf: true, show_three_net_details: true
  });
});

test('unknown or malformed switch values are treated as closed', () => {
  assert.equal(normalizeSiteSwitch('maybe'), false);
  assert.equal(normalizeSiteSwitch('') , false);
  assert.equal(normalizeSiteSwitch('OFF'), false);
  assert.equal(normalizeSiteSwitch('on'), true);
});

test('hasAnySiteSwitch only reports explicitly provided switches', () => {
  assert.equal(hasAnySiteSwitch(undefined), false);
  assert.equal(hasAnySiteSwitch({}), false);
  assert.equal(hasAnySiteSwitch({ site_title: 'x' }), false);
  assert.equal(hasAnySiteSwitch({ show_price: false }), true);
});

test('aggregated switches hide content when any site turns it off', () => {
  const merged = aggregateSiteSwitches([
    { show_price: 'true', show_expire: 'true' },
    { show_price: 'false' },
    null,
    undefined
  ]);
  assert.equal(merged.show_price, false);
  assert.equal(merged.show_expire, true);
  assert.equal(merged.show_tf, false);
});

test('aggregated switches stay closed when no site reports them', () => {
  assert.deepEqual(aggregateSiteSwitches([{}, null]), { ...DEFAULT_SITE_SWITCHES });
  assert.deepEqual(aggregateSiteSwitches([]), { ...DEFAULT_SITE_SWITCHES });
});
