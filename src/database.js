let env = require("../env.json");
let { Pool } = require("pg");

let pool;

pool = new Pool(env);
pool.connect().then(() => {
  console.log("Connected to database.");
});

module.exports = pool;
