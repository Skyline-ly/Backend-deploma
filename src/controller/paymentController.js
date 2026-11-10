import express from 'express';
import crypto from 'node:crypto';
const router = express.Router();

const MERCHANT_ID = process.env.PAYWAY_MERCHANT_ID;
const PUBLIC_KEY = process.env.PAYWAY_PUBLIC_KEY;

// Public HTTPS tunnel (ngrok) so PayWay's sandbox can actually reach
// /payment-callback — swap this for your own tunnel URL when testing.
//
// This domain must be whitelisted with PayWay's integration team against
// your merchant profile first, or the callback silently never arrives (no
// error — PayWay just never calls it). See docs/01-getting-started.md,
// Step 5, for details. ngrok's free tier assigns a new random domain each
// restart, so it needs re-whitelisting every time unless you use a paid
// static domain.
const RETURN_URL = 'https://juggle-stonewall-launder.ngrok-free.dev/payment-callback';

const PURCHASE_URL = 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase';
const CHECK_TRANSACTION_URL = 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction-2';

// Check Transaction API wants req_time as UTC 'YYYYMMDDHHmmss' — a different
// format from the Purchase API's unix-seconds req_time above. Don't reuse
// one req_time value for both calls.
function utcTimestamp() {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

/**
 * POST /create-payment
 *
 * Builds and signs a PayWay purchase request, then calls PayWay's Purchase
 * API directly from the server (not the browser). PayWay's response is
 * JSON containing a ready-to-display QR code (base64 PNG) and an ABA
 * Mobile deep link — no PayWay-hosted popup or redirect page is involved,
 * so the frontend just renders that JSON itself.
 *
 * We landed here (rather than PayWay's standard AbaPayway.checkout()
 * widget) after the widget's popup got stuck on a loading spinner in
 * testing, with no confirmed root cause (possibly a browser extension —
 * see the CORS failure on checkout_cross.svg noted during debugging).
 * Calling the Purchase API straight from the server sidesteps that
 * entirely and also avoids CORS, which blocks this endpoint when called
 * via browser-side fetch() (PayWay only supports full-page form
 * navigation or server-to-server calls, not cross-origin XHR/fetch from
 * the browser).
 *
 * Hash formula confirmed against PayWay's official Purchase API docs
 * (https://developer.payway.com.kh/purchase-14530820e0): the hash is
 * HMAC-SHA512, base64-encoded, over ALL of the fields below concatenated
 * in this exact order (empty string for anything unused) — not just the
 * 4 fields this example used to hash. Every field concatenated into the
 * hash must also be submitted in the request (even if empty), or PayWay
 * recomputes a different hash and rejects the request as "Wrong Hash".
 *
 * REMAINING UNCERTAINTY (teaching note): PayWay's sandbox issues *two*
 * kinds of key material — a Public Key and an RSA public/private key
 * pair — and which one signs this request (and whether it's HMAC or RSA
 * signing) is not confirmed. The docs' PHP sample calls it "$api_key",
 * which is assumed here to correspond to the Public Key from
 * credential_info.txt, but that mapping itself is unverified. If HMAC
 * with the Public Key still fails, try process.env.PAYWAY_RSA_PRIVATE_KEY
 * with crypto.sign() instead.
 */
router.post('/create-payment', async (req, res) => {
  const tran_id = `order-${Date.now()}`;
  const req_time = Math.floor(Date.now() / 1000).toString();

  // Field order matches the docs' $b4hash concatenation exactly. Most of
  // these are left empty since this teaching example doesn't collect real
  // customer/order details — they must still be present (as '') because
  // they're part of what's hashed.
  const fields = {
    req_time,
    merchant_id: MERCHANT_ID,
    tran_id,
    amount: '1.00', // hardcoded for the sandbox teaching example
    items: '',
    shipping: '0', // PayWay types this as a number — '' fails as "Wrong shipping price"
    firstname: 'Test',
    lastname: 'Customer',
    email: '',
    phone: '0123456789',
    type: '',
    payment_option: '',
    return_url: RETURN_URL,
    cancel_url: '',
    continue_success_url: '',
    return_deeplink: '',
    currency: 'USD',
    custom_fields: '',
    return_params: '',
    payout: '',
    lifetime: '30', // minutes; PayWay requires >= 3
    additional_params: '',
    google_pay_token: '',
    skip_success_page: '0', // integer per PayWay's schema
  };

  const stringToHash = Object.values(fields).join('');
  const hash = crypto
    .createHmac('sha512', PUBLIC_KEY || '')
    .update(stringToHash)
    .digest('base64');

  const paywayRes = await fetch(PURCHASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...fields, hash }),
  });
  const data = await paywayRes.json();

  // PayWay's purchase response doesn't echo tran_id back, but the frontend
  // needs it to poll /check-payment-status (Step 2 of PayWay's integration
  // steps: https://developer.payway.com.kh/ecommerce-checkout-3158159f0).
  res.json({ ...data, tran_id });
});

/**
 * POST /check-payment-status
 *
 * Step 2 of PayWay's documented integration flow ("Verify Payment Status")
 * — https://developer.payway.com.kh/ecommerce-checkout-3158159f0. After
 * creating a transaction, poll this to confirm whether the customer has
 * actually completed payment; PayWay's async callback (see
 * /payment-callback below) is the other way to learn this, but polling
 * lets the frontend show a result without depending on a publicly
 * reachable return_url.
 *
 * Hash formula confirmed against PayWay's Check Transaction API docs
 * (https://developer.payway.com.kh/check-transaction-14530826e0):
 * HMAC-SHA512, base64-encoded, over req_time + merchant_id + tran_id,
 * signed with the Public Key — same key as /create-payment's Purchase API
 * hash, but a different req_time format (see utcTimestamp() above) and a
 * much shorter set of fields.
 *
 * Per PayWay's docs: this endpoint is rate-limited to 600 req/s and only
 * looks back 7 days; stop polling once a non-pending result comes back.
 */
router.post('/check-payment-status', async (req, res) => {
  const { tran_id } = req.body;
  const req_time = utcTimestamp();

  const stringToHash = `${req_time}${MERCHANT_ID}${tran_id}`;
  const hash = crypto
    .createHmac('sha512', PUBLIC_KEY || '')
    .update(stringToHash)
    .digest('base64');

  const paywayRes = await fetch(CHECK_TRANSACTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ req_time, merchant_id: MERCHANT_ID, tran_id, hash }),
  });
  const data = await paywayRes.json();

  res.json(data);
});

/**
 * POST /payment-callback
 *
 * PayWay calls this endpoint (your return_url) after a payment attempt
 * completes. This must be a publicly reachable HTTPS URL when testing
 * against the real sandbox (use a tool like ngrok for local dev).
 *
 * For this teaching example, we just log the payload and respond 200.
 * A real implementation should verify the payload and update the order
 * status in a database — covered in docs/03-refunds-and-callbacks.md.
 */
router.post('/payment-callback', (req, res) => {
  console.log('Received PayWay callback:', req.body);
  // TODO: verify signature/authenticity of this callback before trusting it
  // TODO: look up the order by tran_id and mark it paid/failed
  res.sendStatus(200);
});

export default router;
