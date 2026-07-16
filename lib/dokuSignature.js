/**
 * lib/dokuSignature.js — DOKU Checkout API (Non-SNAP) signature helper.
 *
 * Dari dokumentasi developers.doku.com (Get Started with DOKU API →
 * Signature Component → Non-SNAP → Signature Component from Request Header):
 *
 *   Digest           = Base64( SHA256(rawRequestBodyJSON) )
 *   signatureString  = "Client-Id:"          + clientId       + "\n"
 *                     + "Request-Id:"        + requestId      + "\n"
 *                     + "Request-Timestamp:" + timestamp      + "\n"
 *                     + "Request-Target:"    + requestTarget  + "\n"
 *                     + "Digest:"            + digest
 *   Signature        = "HMACSHA256=" + Base64( HMAC_SHA256(signatureString, secretKey) )
 *
 * requestTarget = path saja (tanpa host), mis. "/checkout/v1/payment".
 *
 * NOTE: folder ini di luar api/ supaya Vercel tidak menganggapnya endpoint.
 */
const crypto = require('crypto');

function digestOf(rawBody) {
  return crypto.createHash('sha256').update(rawBody, 'utf8').digest('base64');
}

function isoTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Bangun header untuk request ke DOKU (POST dengan body).
 * @returns {{headers: object, requestId: string, timestamp: string, digest: string}}
 */
function buildRequestHeaders({ clientId, secretKey, requestTarget, rawBody }) {
  const requestId = crypto.randomUUID();
  const timestamp = isoTimestamp();
  const digest = digestOf(rawBody);
  const signatureString =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${requestTarget}\n` +
    `Digest:${digest}`;
  const signature = 'HMACSHA256=' + crypto.createHmac('sha256', secretKey).update(signatureString).digest('base64');

  return {
    headers: {
      'Client-Id': clientId,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      'Signature': signature,
      'Digest': digest,
    },
    requestId, timestamp, digest,
  };
}

/**
 * Verifikasi signature dari notifikasi/webhook DOKU — sama formulanya, DOKU
 * menandatangani balik pakai Secret Key yang sama supaya merchant tahu
 * request itu benar-benar dari DOKU.
 */
function verifyNotificationSignature({ secretKey, clientId, requestId, timestamp, requestTarget, rawBody, signatureHeader }) {
  if (!signatureHeader) return false;
  const digest = digestOf(rawBody);
  const signatureString =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${requestTarget}\n` +
    `Digest:${digest}`;
  const expected = 'HMACSHA256=' + crypto.createHmac('sha256', secretKey).update(signatureString).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureHeader));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { buildRequestHeaders, verifyNotificationSignature, digestOf, isoTimestamp };
