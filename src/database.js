import env from "dotenv";
import pg from "pg";
const { Pool } = pg;

env.config();

let databaseConfig;
// fly.io sets NODE_ENV to production automatically, otherwise it's unset when running locally
if (process.env.NODE_ENV == "production") {
	databaseConfig = { connectionString: process.env.DATABASE_URL };
} else {
	let { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT } = process.env;
	databaseConfig = { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT };
}

let pool = new Pool(databaseConfig);
pool.connect().then(() => {
  console.log("Connected to database.");
});

export default pool;
