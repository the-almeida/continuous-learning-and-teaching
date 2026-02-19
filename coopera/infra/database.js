import { Pool } from "pg";

const pool = new Pool({
  max: Number(process.env.POSTGRES_POOL_MAX_CONNECTIONS) || 10,
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
});

async function query(queryObject) {
  return pool.query(queryObject);
}

const database = {
  query: query,
};

export default database;
