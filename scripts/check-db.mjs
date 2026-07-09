import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

try {
  const cols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
  );
  console.log("users columns:", cols.rows.map((r) => r.column_name).join(", "));

  const groups = await pool.query(
    "SELECT to_regclass('public.\"documentGroups\"') as exists"
  );
  console.log("documentGroups table:", groups.rows[0]?.exists);

  const migrations = await pool.query(
    "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at"
  ).catch(() => ({ rows: [] }));
  console.log(
    "migrations:",
    migrations.rows.map((r) => r.hash ?? r.id ?? JSON.stringify(r))
  );
} catch (e) {
  console.error(e);
} finally {
  await pool.end();
}
