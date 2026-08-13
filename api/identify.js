const Anthropic = require('@anthropic-ai/sdk');
const { requireAuth } = require('./_lib/auth');
const { SYSTEM_PROMPT } = require('./_lib/prompt');
const { parseProduse } = require('./_lib/jsonRecover');

const MAX_TEXT_LENGTH = 4000; // clientul trimite loturi de max 2200 caractere; marja de siguranta

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const text = req.body && req.body.text;
  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Lipseste textul solicitarii.' });
    return;
  }
  if (text.length > MAX_TEXT_LENGTH) {
    res.status(400).json({ error: `Textul e prea lung (max ${MAX_TEXT_LENGTH} caractere per lot).` });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY nu este configurata pe server.' });
    return;
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Solicitarea clientului:\n\n${text}` }],
    });

    const textBlock = (msg.content || []).find((b) => b.type === 'text');
    if (!textBlock) {
      res.status(502).json({ error: 'Raspuns gol de la model.' });
      return;
    }

    const produse = parseProduse(textBlock.text);
    res.status(200).json({ produse });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: `Eroare la apelul catre model: ${err.message}` });
  }
};
