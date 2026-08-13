const crypto = require('crypto');

const COOKIE_NAME = 'acp_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 zile

function sign(expiresAtMs) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET nu este setat');
  const hmac = crypto.createHmac('sha256', secret).update(String(expiresAtMs)).digest('hex');
  return `${expiresAtMs}.${hmac}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return false;
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const expiresAtStr = token.slice(0, dotIndex);
  const hmac = token.slice(dotIndex + 1);
  const expiresAtMs = Number(expiresAtStr);
  if (!Number.isFinite(expiresAtMs)) return false;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  const expected = crypto.createHmac('sha256', secret).update(expiresAtStr).digest('hex');
  const a = Buffer.from(hmac, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  return expiresAtMs > Date.now();
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return verify(cookies[COOKIE_NAME]);
}

// Foloseste-l ca prima linie in orice handler protejat. Intoarce false (si a trimis deja
// raspunsul 401) daca nu-i autentificat - handler-ul trebuie sa opreasca executia in acel caz.
function requireAuth(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Neautentificat' });
    return false;
  }
  return true;
}

function setSessionCookie(res) {
  const expiresAtMs = Date.now() + MAX_AGE_SECONDS * 1000;
  const token = sign(expiresAtMs);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  );
}

module.exports = { requireAuth, isAuthenticated, setSessionCookie, clearSessionCookie };
