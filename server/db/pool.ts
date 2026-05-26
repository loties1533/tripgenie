// =============================================
// TRIPGENIE — server/db/pool.ts
// Connexion PostgreSQL directe via node-postgres (pg)
// Remplace le client Supabase — plus de service_role_key,
// connexion avec DATABASE_URL (rôle applicatif restreint possible)
// =============================================

import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

let pool: Pool | null = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,              // max connexions simultanées
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
  });

  console.log('✅ PostgreSQL pool connecté');
} else {
  console.warn('⚠️  DATABASE_URL non configuré — sauvegarde désactivée');
}

export default pool;
