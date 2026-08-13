# ACP — Identificare coduri produse

Aplicație web pentru identificarea codurilor de articol ACP dintr-o solicitare
de client, cu verificare automată față de o bază de coduri reale Priority
partajată între toți utilizatorii. Găzduită pe Vercel, cu Postgres pentru
baza de coduri și o parolă comună pentru acces.

## Arhitectură

- `public/index.html` — interfața (static, fără build step).
- `api/*.js` — funcții serverless Node (Vercel le detectează automat).
- `api/_lib/prompt.js` — catalogul tehnic ACP și prompt-ul de sistem (server-only, nu ajunge niciodată în browser).
- Postgres (Vercel Storage) — tabelul `priority_codes`, comun tuturor utilizatorilor.
- Autentificare — o singură parolă comună (`APP_PASSWORD`), sesiune ținută într-un cookie semnat HMAC (`AUTH_SECRET`).

## Setup — pași o singură dată

1. **Cont GitHub** (dacă nu ai deja) și un repository nou pentru acest proiect.
2. **Cont Vercel** — cel mai simplu prin login cu GitHub, pe [vercel.com](https://vercel.com).
3. **Cheie API Anthropic** — de pe [console.anthropic.com](https://console.anthropic.com) → API Keys (necesită billing activ pe cont).
4. **Import proiect în Vercel**: New Project → Import repo-ul de GitHub.
5. **Atașează Postgres**: în proiectul Vercel → tab Storage → Create Database → Postgres → Connect to Project. Asta injectează automat variabila `POSTGRES_URL`.
6. **Variabile de mediu**: Project → Settings → Environment Variables, adaugă:
   - `ANTHROPIC_API_KEY` — cheia de la pasul 3
   - `APP_PASSWORD` — parola pe care o distribui colegilor
   - `AUTH_SECRET` — un string random lung (minim 32 caractere). Generezi unul cu:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
7. Redeploy (sau primul deploy pornește automat după import).
8. Distribuie URL-ul aplicației + `APP_PASSWORD` colegilor.

## Dezvoltare locală

```bash
npm install -g vercel   # daca nu ai deja Vercel CLI
vercel link             # leaga folderul de proiectul Vercel creat mai sus
vercel env pull .env.local   # aduce local POSTGRES_URL / ANTHROPIC_API_KEY / APP_PASSWORD / AUTH_SECRET
vercel dev              # serveste public/ + /api/* local, identic cu productia
```

Nu e nevoie de un Postgres local separat — dezvoltarea locală folosește aceeași
bază Vercel/Neon din producție (e un tool intern, cu un singur set de date).

## Structură fișiere

```
package.json
vercel.json
public/index.html          interfata aplicatiei
api/identify.js             POST — identifica produse folosind Claude (auth-gated)
api/db.js                   GET/POST — citeste/inlocuieste baza de coduri Priority (auth-gated)
api/login.js                POST {password} — autentificare
api/logout.js               POST — deconectare
api/session.js               GET — starea sesiunii curente
api/_lib/auth.js             semnare/verificare cookie de sesiune
api/_lib/db.js                acces Postgres (schema + citire/inlocuire)
api/_lib/prompt.js            catalog tehnic ACP + prompt de sistem
api/_lib/jsonRecover.js       parsare robusta a raspunsului JSON de la model
```

## Verificare după deploy

1. Deschide URL-ul aplicației — trebuie să apară ecranul de parolă.
2. Introdu `APP_PASSWORD` — trebuie să intri în aplicație.
3. Panoul "00" → încarcă fișierul Excel cu coduri Priority (foaia "Articole identificate").
4. Reîncarcă pagina — numărul de coduri încărcate trebuie să rămână (dovadă că e salvat în Postgres, nu doar în browser).
5. Lipește o solicitare de test în panoul "01" → "Identifică produsele" → trebuie să apară un tabel cu rezultate.
6. Testează "Copiază tabelul" și "Exportă Excel".
7. "Deconectare" din header → trebuie să te întoarcă la ecranul de parolă.
