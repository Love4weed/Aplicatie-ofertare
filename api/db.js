const { requireAuth } = require('./_lib/auth');
const { getPairs, replacePairs } = require('./_lib/db');

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    try {
      const pairs = await getPairs();
      res.status(200).json({ pairs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Nu am putut citi baza de coduri.' });
    }
    return;
  }

  if (req.method === 'POST') {
    const pairs = req.body && req.body.pairs;
    const valid =
      Array.isArray(pairs) && pairs.every((p) => Array.isArray(p) && p.length === 2);
    if (!valid) {
      res.status(400).json({ error: 'Format invalid: se astepta {pairs: [[familie, cod], ...]}' });
      return;
    }
    try {
      const count = await replacePairs(pairs);
      res.status(200).json({ ok: true, count });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Nu am putut salva baza de coduri.' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
