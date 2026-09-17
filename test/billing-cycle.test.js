import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BILLING_CYCLES,
  detectBillingCycle,
  formatBillingPrice,
  getBillingCycleOption,
  isRenewableBillingCycle,
  normalizeBillingCycle,
  renewExpireDateIfNeeded
} from '../src/frontend/utils/server.js';
import {
  detectBillingCycle as workerDetectBillingCycle,
  isRenewableBillingCycle as workerIsRenewableBillingCycle,
  normalizeBillingCycle as workerNormalizeBillingCycle,
  renewExpireDateIfNeeded as workerRenewExpireDateIfNeeded
} from '../src/utils/serverBilling.js';

test('one_time cycle is registered with no billing period', () => {
  const option = BILLING_CYCLES.find(item => item.value === 'one_time');
  assert.ok(option, 'one_time cycle must exist');
  assert.equal(option.months, 0);
  assert.equal(option.oneTime, true);
  assert.equal(option.labelZh, '一次性');
  assert.equal(option.labelEn, 'One-time');
  assert.equal(getBillingCycleOption('one_time').value, 'one_time');
  assert.equal(isRenewableBillingCycle('one_time'), false);
  assert.equal(isRenewableBillingCycle('month'), true);
});

test('one_time is detected from billing_cycle and price text', () => {
  assert.equal(normalizeBillingCycle('one_time'), 'one_time');
  assert.equal(normalizeBillingCycle('一次性'), 'one_time');
  assert.equal(normalizeBillingCycle('one-time'), 'one_time');
  assert.equal(normalizeBillingCycle('ONETIME'), 'one_time');
  assert.equal(detectBillingCycle('¥40.00/一次性'), 'one_time');
  assert.equal(detectBillingCycle('40.00 one-time'), 'one_time');
  assert.equal(detectBillingCycle('一次性付费'), 'one_time');
  // 其它周期不受影响
  assert.equal(detectBillingCycle('¥40.00/月'), 'month');
  assert.equal(detectBillingCycle('¥40.00/年'), 'year');
  assert.equal(detectBillingCycle('¥40.00'), '');
  assert.equal(normalizeBillingCycle(''), 'month');
  assert.equal(normalizeBillingCycle('unknown-cycle'), 'month');
});

test('one_time never auto renews', () => {
  const past = '2026-01-01';
  const result = renewExpireDateIfNeeded(past, 'one_time', '1');
  assert.deepEqual(result, { expire_date: past, renewed: false });

  // 其它周期照旧续费到未来
  const monthResult = renewExpireDateIfNeeded(past, 'month', '1');
  assert.equal(monthResult.renewed, true);
  assert.ok(monthResult.expire_date > '2026-01-01');
});

test('one_time price renders as 一次性 / Once', () => {
  const server = { price: '40.00', currency: '¥', billing_cycle: 'one_time' };
  assert.equal(formatBillingPrice(server, 'zh'), '¥40.00/一次性');
  assert.equal(formatBillingPrice(server, 'en'), '¥40.00/Once');
});

test('worker copy and frontend copy agree', () => {
  const samples = ['one_time', '一次性', 'one-time', 'once', 'month', '年', '', 'bogus'];
  for (const sample of samples) {
    assert.equal(workerNormalizeBillingCycle(sample), normalizeBillingCycle(sample), `normalize(${sample})`);
    assert.equal(workerDetectBillingCycle(sample), detectBillingCycle(sample), `detect(${sample})`);
  }
  assert.equal(workerIsRenewableBillingCycle('one_time'), false);
  assert.deepEqual(
    workerRenewExpireDateIfNeeded('2026-01-01', 'one_time', '1'),
    { expire_date: '2026-01-01', renewed: false }
  );
});
