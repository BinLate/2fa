'use strict';

const crypto = require('crypto');

const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const SECRET = 'Q3O6CDXZSZKLND2RPE2OPYORJGR6IJKE';

function base32Decode(str) {
  str = String(str || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (let i = 0; i < str.length; i++) {
    const val = BASE32_ALPHABET.indexOf(str[i]);
    if (val === -1) throw new Error('Invalid Base32 character');
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i < bits.length - 7; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function uintToBuf(num) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(num));
  return buf;
}

function generateAtCounter(secret, counter) {
  const key = base32Decode(secret);
  const msg = uintToBuf(counter);
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = (bin >>> 0) % Math.pow(10, TOTP_DIGITS);
  return code.toString().padStart(TOTP_DIGITS, '0');
}

function windowAt(secret, epochSec) {
  const slot = Math.floor(epochSec / TOTP_PERIOD);
  return {
    current: generateAtCounter(secret, slot),
    next: generateAtCounter(secret, slot + 1),
    slot: slot,
    remaining: TOTP_PERIOD - (epochSec % TOTP_PERIOD)
  };
}

function assert(cond, message) {
  if (!cond) {
    console.error('FAIL ' + message);
    process.exitCode = 1;
    return false;
  }
  console.log('PASS ' + message);
  return true;
}

const offsets = [0, 25, 29];
const base = 1700000000;
let failed = 0;

offsets.forEach(function (offset) {
  const t = base - (base % TOTP_PERIOD) + offset;
  const now = windowAt(SECRET, t);
  const later = windowAt(SECRET, t + TOTP_PERIOD);
  if (!assert(now.next === later.current, 'rollover t%30===' + offset + ' next(' + t + ')===' + now.next + ' current(t+30)===' + later.current)) {
    failed++;
  }
  if (!assert(now.current.length === 6 && now.next.length === 6, '6 digits at t%30===' + offset)) failed++;
  if (!assert(now.current !== now.next, 'current !== next at t%30===' + offset)) failed++;
  if (!assert(now.remaining === TOTP_PERIOD - offset, 'remaining at t%30===' + offset + ' === ' + now.remaining)) failed++;
});

if (failed) {
  console.error(failed + ' assertion(s) failed');
  process.exit(1);
}
console.log('All TOTP window tests passed');
