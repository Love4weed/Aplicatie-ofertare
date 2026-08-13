const { sql, db } = require('@vercel/postgres');

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS priority_codes (
      id SERIAL PRIMARY KEY,
      familie TEXT NOT NULL,
      cod TEXT NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_priority_codes_familie ON priority_codes(familie)
  `;
}

async function getPairs() {
  await ensureSchema();
  const { rows } = await sql`SELECT familie, cod FROM priority_codes ORDER BY id`;
  return rows.map((r) => [r.familie, r.cod]);
}

// Inlocuieste tot setul de date intr-o tranzactie (folosit la fiecare upload nou de catalog Priority).
async function replacePairs(pairs) {
  await ensureSchema();
  const familii = pairs.map((p) => String(p[0]));
  const coduri = pairs.map((p) => String(p[1]));

  const client = await db.connect();
  try {
    await client.sql`BEGIN`;
    await client.sql`DELETE FROM priority_codes`;
    if (familii.length) {
      await client.query(
        'INSERT INTO priority_codes (familie, cod) SELECT * FROM UNNEST($1::text[], $2::text[])',
        [familii, coduri]
      );
    }
    await client.sql`COMMIT`;
  } catch (err) {
    await client.sql`ROLLBACK`;
    throw err;
  } finally {
    client.release();
  }
  return pairs.length;
}

module.exports = { getPairs, replacePairs };
