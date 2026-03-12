import database from "@/infra/database";

export async function GET() {
  const updatedAt = new Date().toISOString();

  const databaseName = process.env.POSTGRES_DB;
  const [versionResult, maxConnResult, currentConnResult] = await Promise.all([
    database.query(`SHOW server_version;`),
    database.query(`SHOW max_connections;`),
    database.query({
      text: "SELECT COUNT(*) AS current_connections FROM pg_stat_activity WHERE datname = $1;",
      values: [databaseName],
    }),
  ]);

  const version = versionResult.rows[0].server_version;
  const maxConnections = parseInt(maxConnResult.rows[0].max_connections);
  const currentConnections = parseInt(
    currentConnResult.rows[0].current_connections,
  );

  return Response.json({
    updated_at: updatedAt,
    "Do you speak Portuguese?":
      "Claro mermão, mais especificamente em UTF-8 (SmileIfYouReadThis highlighted because of a PT-BR typo)",
    database: {
      version,
      max_connections: maxConnections,
      current_connections: currentConnections,
    },
  });
}
