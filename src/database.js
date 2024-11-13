import env from "../env.json" with { type: "json" };
import pg from "pg";
const { Pool } = pg;

let pool = new Pool(env);
pool.connect().then(() => {
  console.log("Connected to database.");
});

export default pool;