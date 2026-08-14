const { createPool } = require('@vercel/postgres');

// Integrarile de Postgres pe Vercel nu folosesc mereu acelasi nume de variabila
// (integrarea Neon mai noua seteaza DATABASE_URL / POSTGRES_URL_NON_POOLING, nu POSTGRES_URL) -
// cautam string-ul de conexiune in orice varianta e disponibila, in loc sa depindem de una fixa.
const connectionString =
  process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;

const pool = createPool({ connectionString });

async function ensureSchema() {
  await pool.sql`
    CREATE TABLE IF NOT EXISTS priority_codes (
      id SERIAL PRIMARY KEY,
      familie TEXT NOT NULL,
      cod TEXT NOT NULL
    )
  `;
  await pool.sql`
    CREATE INDEX IF NOT EXISTS idx_priority_codes_familie ON priority_codes(familie)
  `;
}

async function getPairs() {
  await ensureSchema();
  const { rows } = await pool.sql`SELECT familie, cod FROM priority_codes ORDER BY id`;
  return rows.map((r) => [r.familie, r.cod]);
}

// Inlocuieste tot setul de date intr-o tranzactie (folosit la fiecare upload nou de catalog Priority).
async function replacePairs(pairs) {
  await ensureSchema();
  const familii = pairs.map((p) => String(p[0]));
  const coduri = pairs.map((p) => String(p[1]));

  const client = await pool.connect();
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
