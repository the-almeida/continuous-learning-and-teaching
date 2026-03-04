test("GET to /api/status should return 200 and have Brazilian Carioca Accent", async () => {
  const response = await fetch("http://localhost:3000/api/status", {
    method: "GET",
  });
  expect(response.status).toBe(200);

  const responseBody = await response.json();

  expect(responseBody).toHaveProperty(
    "Do you speak Portuguese?",
    "Claro mermão, mais especificamente em UTF-8 (SmileIfYouReadThis highlighted because of a PT-BR typo)",
  );

  expect(responseBody).toHaveProperty("updated_at");
  const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();
  expect(parsedUpdatedAt).toBe(responseBody.updated_at);

  // Check database status properties
  expect(responseBody).toHaveProperty("database");
  expect(responseBody.database).toHaveProperty("max_connections");
  expect(responseBody.database).toHaveProperty("current_connections");
  expect(responseBody.database).toHaveProperty("version");
  expect(responseBody.database.max_connections).toBeGreaterThan(0);
  expect(responseBody.database.current_connections).toBeGreaterThanOrEqual(1);
  expect(responseBody.database.current_connections).toBeLessThanOrEqual(
    responseBody.database.max_connections,
  );
  expect(typeof responseBody.database.version).toBe("string");
  expect(responseBody.database.version).toMatch(/^\d+/);
});
