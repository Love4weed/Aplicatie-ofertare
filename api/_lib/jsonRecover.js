function stripCodeFences(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '');
}

// Extrage obiectele individuale complete { ... } dintr-un raspuns JSON trunchiat/malformat.
function recoverPartialJson(cleaned) {
  const results = [];
  const objRegex = /\{[^{}]*\}/g;
  let m;
  while ((m = objRegex.exec(cleaned)) !== null) {
    try {
      const obj = JSON.parse(m[0]);
      if (obj.cod) results.push(obj);
    } catch (e) {
      // ignora obiectul incomplet
    }
  }
  return results;
}

// Parseaza raspunsul textual al modelului intr-un array de produse, cu acelasi lant de
// fallback-uri progresive ca in aplicatia originala (util cand modelul trunchiaza raspunsul
// pe loturi mari sau adauga text/code fences in jurul JSON-ului).
function parseProduse(rawText) {
  const cleaned = stripCodeFences(rawText);

  try {
    const parsed = JSON.parse(cleaned);
    return parsed.produse || [];
  } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return parsed.produse || [];
      } catch (e2) {
        const recovered = recoverPartialJson(cleaned);
        if (recovered.length) return recovered;
        throw new Error('Raspunsul a fost intrerupt si nu a putut fi recuperat (posibil lot prea mare).');
      }
    }
    throw new Error('Nu am putut interpreta raspunsul ca JSON.');
  }
}

module.exports = { parseProduse };
