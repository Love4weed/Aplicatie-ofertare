const crypto = require('crypto');
const { setSessionCookie } = require('./_lib/auth');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const expected = process.env.APP_PASSWORD || '';
  const given = typeof req.body?.password === 'string' ? req.body.password : '';

  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  const match = expected.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) {
    res.status(401).json({ error: 'Parola incorecta' });
    return;
  }

  setSessionCookie(res);
  res.status(200).json({ ok: true });
};
