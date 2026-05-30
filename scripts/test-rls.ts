// =============================================
// TRIPGENIE — scripts/test-rls.ts
// VÉRIFICATION du RLS « maison » (géré par NOUS, pas par Supabase Auth).
//
// BUT : prouver, AVANT de migrer la moindre route, que la 2ᵉ barrière marche.
//   ① on se connecte bien avec le rôle dédié tripgenie_app, SANS BYPASSRLS
//   ② sans contexte utilisateur → AUCUNE ligne visible (fail-closed = sûr)
//   ③ avec withUser(A) → on ne voit QUE les données de A, jamais celles de B
//
// LANCER :  npx tsx scripts/test-rls.ts
//   (nécessite : migration 0001 appliquée dans Supabase + DATABASE_URL rempli
//    dans .env, pointant sur le rôle tripgenie_app)
//
// Le script crée 2 utilisateurs de test + 1 voyage chacun, vérifie l'isolation,
// puis NETTOIE tout dans un bloc finally (même en cas d'erreur) → aucune trace.
// Ce fichier n'est PAS compilé par `tsc` (tsconfig.include = server/**) : il sert
// uniquement d'outil de vérification, exécuté via tsx.
// =============================================

import 'dotenv/config'; // DOIT être le 1er import : pg.ts lit DATABASE_URL au chargement
import pool, { query, withUser } from '../server/db/pg.js';

// UUID de test volontairement reconnaissables (collision quasi impossible).
const USER_A = '00000000-0000-0000-0000-0000000000aa';
const USER_B = '00000000-0000-0000-0000-0000000000bb';

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = ''): void {
  const suffix = detail ? ` — ${detail}` : '';
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}${suffix}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}${suffix}`);
  }
}

// Suppression dans le contexte de chaque user : le RLS n'autorise QUE ses lignes.
// Supprimer le user cascade sur ses trips (ON DELETE CASCADE). Best-effort.
async function cleanup(): Promise<void> {
  try {
    await withUser(USER_A, (c) => c.query('DELETE FROM users WHERE id = $1', [USER_A]));
  } catch { /* best-effort */ }
  try {
    await withUser(USER_B, (c) => c.query('DELETE FROM users WHERE id = $1', [USER_B]));
  } catch { /* best-effort */ }
}

async function main(): Promise<void> {
  if (!pool) {
    console.error('❌ DATABASE_URL absent dans .env — impossible de tester la couche pg/RLS.');
    process.exit(1);
  }

  console.log('\n🔒 TEST RLS « maison » — TripGenie\n');

  // ── ① Bon rôle, SANS BYPASSRLS ──────────────────────────────────────────
  console.log('① Connexion & rôle');
  const role = await query<{ role: string; bypassrls: boolean | null }>(
    `SELECT current_user AS role,
            (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypassrls`,
  );
  const { role: roleName, bypassrls } = role.rows[0];
  check('connecté en tant que tripgenie_app', roleName === 'tripgenie_app', `rôle = ${roleName}`);
  check('le rôle NE contourne PAS le RLS (NOBYPASSRLS)', bypassrls === false, `rolbypassrls = ${bypassrls}`);

  // État propre au cas où un run précédent aurait laissé des traces.
  await cleanup();

  // ── Préparer les données : 2 users + 1 trip chacun ──────────────────────
  await withUser(USER_A, async (c) => {
    await c.query('INSERT INTO users (id, email, password, name) VALUES ($1, $2, $3, $4)', [
      USER_A, 'rls-test-a@tripgenie.invalid', 'x', 'RLS Test A',
    ]);
    await c.query('INSERT INTO trips (user_id, title, destination) VALUES ($1, $2, $3)', [
      USER_A, 'TRIP_A', 'Lisbonne',
    ]);
  });
  await withUser(USER_B, async (c) => {
    await c.query('INSERT INTO users (id, email, password, name) VALUES ($1, $2, $3, $4)', [
      USER_B, 'rls-test-b@tripgenie.invalid', 'x', 'RLS Test B',
    ]);
    await c.query('INSERT INTO trips (user_id, title, destination) VALUES ($1, $2, $3)', [
      USER_B, 'TRIP_B', 'Tokyo',
    ]);
  });

  // ── ② Fail-closed : aucun contexte → 0 ligne ────────────────────────────
  console.log('\n② Sans contexte utilisateur (fail-closed)');
  const noCtx = await query<{ n: number }>('SELECT COUNT(*)::int AS n FROM trips');
  check(
    'SELECT trips sans app.current_user_id → 0 ligne',
    noCtx.rows[0].n === 0,
    `${noCtx.rows[0].n} ligne(s) visible(s)`,
  );

  // ── ③ Isolation inter-utilisateurs ──────────────────────────────────────
  console.log('\n③ Isolation : A ne voit pas B, B ne voit pas A');
  const aTrips = await withUser(USER_A, (c) =>
    c.query<{ user_id: string; title: string }>('SELECT user_id, title FROM trips'),
  );
  const aSeesOwn = aTrips.rows.some((r) => r.title === 'TRIP_A');
  const aSeesB = aTrips.rows.some((r) => r.user_id === USER_B);
  check('A voit bien SON voyage', aSeesOwn);
  check('A NE voit PAS le voyage de B', !aSeesB, aSeesB ? '⚠️ FUITE détectée !' : 'aucune fuite');

  const bTrips = await withUser(USER_B, (c) =>
    c.query<{ user_id: string; title: string }>('SELECT user_id, title FROM trips'),
  );
  const bSeesA = bTrips.rows.some((r) => r.user_id === USER_A);
  check('B NE voit PAS le voyage de A', !bSeesA, bSeesA ? '⚠️ FUITE détectée !' : 'aucune fuite');
}

main()
  .catch((err) => {
    console.error('\n💥 Erreur :', err?.message ?? err);
    console.error('   → Vérifie que la migration 0001 est appliquée et que DATABASE_URL pointe sur tripgenie_app.');
    failed++;
  })
  .finally(async () => {
    await cleanup();
    console.log(`\n────────────\nRésultat : ${passed} ✅  /  ${failed} ❌`);
    console.log(failed === 0 ? '🎉 RLS « maison » opérationnel.\n' : '🚨 RLS NON validé — ne migre PAS les routes tant que ce n\'est pas vert.\n');
    if (pool) await pool.end();
    process.exit(failed === 0 ? 0 : 1);
  });
