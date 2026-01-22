import db from "@/infra/database.js";

export async function GET() {
  const result = await db.query("SELECT 1 + 1");
  console.log(result.rows);
  return Response.json({
    isOnline: true,
    "Do you speak Portuguese?": "Claro mermão, mais específicamente em UTF-8",
  });
}
