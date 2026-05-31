// =============================================
// TRIPGENIE — server/db/pg.ts
// Connexion PostgreSQL DIRECTE (driver natif `pg`), sans passer par
// l'API PostgREST de Supabase ni la SERVICE_KEY.
//
// POURQUOI ce module existe (objectif : RLS gérée par NOUS, pas par Supabase)
// ---------------------------------------------------------------------------
// - Avant, supabase-js parlait à PostgREST avec la SERVICE_KEY, qui a
//   l'attribut BYPASSRLS : le RLS ne s'appliquait JAMAIS. La sécurité ne
//   reposait alors que sur nos `.eq('user_id', ...)` applicatifs.
// - Ici on se connecte en SQL direct avec un rôle dédié SANS BYPASSRLS
//   (voir migrations/0001_rls_self_managed.sql). Le RLS s'applique donc
//   réellement, comme une 2ᵉ barrière (défense en profondeur).
// - PostgREST ne sait pas poser une variable de session par requête.
//   Le driver `pg`, lui, peut ouvrir une transaction et fixer
//   `app.current_user_id` que les policies RLS liront.
//
// ÉTAT : ce module est désormais LA couche d'accès BDD du projet. Toutes les
// routes qui touchent la base passent par query()/withUser() ici.
// supabase-js a été retiré — plus aucun fallback PostgREST ni SERVICE_KEY.
// =============================================

import pg from 'pg';
import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// DATABASE_URL = chaîne de connexion du rôle applicatif dédié (tripgenie_app),
// PAS le rôle postgres de Supabase. Format :
//   postgresql://tripgenie_app:<mot_de_passe>@<host>:5432/postgres
const connectionString = process.env.DATABASE_URL;

let pool: Pool | null = null;

if (connectionString) {
  pool = new pg.Pool({
    connectionString,
    // Supabase impose TLS. Par défaut on accepte le certificat managé.
    // Pour une vérification stricte de la chaîne, fournir DATABASE_SSL_CA
    // (contenu du certificat racine Supabase) → rejectUnauthorized: true.
    ssl: process.env.DATABASE_SSL_CA
      ? { ca: process.env.DATABASE_SSL_CA, rejectUnauthorized: true }
      : { rejectUnauthorized: false },
    max: 10,                       // 10 connexions simultanées max
    idleTimeoutMillis: 30_000,     // ferme une connexion inactive après 30s
    connectionTimeoutMillis: 10_000,
  });

  // Un client du pool peut tomber (réseau, redémarrage Supabase) sans planter
  // tout le process : on logue sans crasher.
  pool.on('error', (err: Error) => console.error('❌ Erreur pool PostgreSQL:', err.message));
  console.log('✅ PostgreSQL (pg) prêt — RLS applicative active');
} else {
  console.warn('⚠️  DATABASE_URL absent — couche pg/RLS désactivée (aucun accès BDD possible)');
}

export default pool;

// ---------------------------------------------------------------------------
// query() — requête SANS contexte utilisateur.
// À réserver aux routes publiques (santé, lecture de partage) ou à la
// maintenance. Le RLS s'applique quand même : sans app.current_user_id défini,
// les policies "propriétaire" ne renvoient AUCUNE ligne (fail-closed = sûr).
// ---------------------------------------------------------------------------
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  if (!pool) throw new Error('PostgreSQL non configuré (DATABASE_URL manquant)');
  return pool.query<T>(text, params as unknown[]);
}

// ---------------------------------------------------------------------------
// withUser() — requête AVEC contexte utilisateur (le cœur du RLS maison).
//
// 1. prend une connexion du pool
// 2. ouvre une transaction (BEGIN)
// 3. fixe app.current_user_id pour CETTE transaction uniquement
// 4. exécute le callback (les requêtes du callback sont filtrées par le RLS)
// 5. COMMIT (ou ROLLBACK si erreur), puis rend la connexion au pool
//
// Pourquoi set_config(..., true) et pas "SET LOCAL app.current_user_id = $1" ?
//   SET LOCAL n'accepte PAS de paramètre lié ($1) → il faudrait concaténer
//   l'UUID dans la chaîne SQL = risque d'injection. set_config(name, val, true)
//   accepte un paramètre lié ET est transaction-locale (3ᵉ arg = is_local).
//
// Pourquoi transaction-local et pas SET de session ?
//   Le pool RÉUTILISE les connexions. Un SET de session resterait collé à la
//   connexion et fuiterait vers la requête suivante d'un AUTRE utilisateur.
//   set_config(..., true) meurt au COMMIT/ROLLBACK → isolation stricte.
// ---------------------------------------------------------------------------
export async function withUser<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!pool) throw new Error('PostgreSQL non configuré (DATABASE_URL manquant)');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release(); // rend la connexion au pool (jamais oublié, même si erreur)
  }
}
