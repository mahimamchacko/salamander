let express = require("express");
let argon2 = require("argon2");
let cookieParser = require("cookie-parser");
let env = require("../env.json");
let ejs = require("ejs");
let { Pool } = require("pg");
let uuid = require("uuid");

let port = 3000;
let hostname;
let database;
if (process.env.NODE_ENV == "production") {
  hostname = "0.0.0.0";
  database = { connectionString: process.env.DATABASE_URL };
} else {
  hostname = "localhost";
  database = { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT } = process.env;
}

let app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());

let pool = new Pool(env);
pool.connect().then(() => {
  console.log("Connected to database");
});

app.get("/", (req, res) => {
  return res.render("index", { posts });
});

app.get("/account/create", (req, res) => {
  return res.render("create");
});

app.post("/account/create", async (req, res) => {
  // validate that request body contains arguments
  if (
    !req.body.hasOwnProperty("username") ||
    !req.body.hasOwnProperty("password")
  ) {
    return res
      .sendStatus(400)
      .json({
        error:
          "The arguments 'username' and 'password' must exist in the request body.",
      });
  }

  let username = req.body.username;
  let password = req.body.password;

  // validate that arguments meet requirements
  if (
    !username ||
    username.length < 6 ||
    username.length > 50 ||
    !password ||
    password < 12 ||
    password > 100
  ) {
    return res
      .status(400)
      .json({
        error:
          "The arguments 'username' must be between 6 and 50 characters (inclusive) and 'password' must be between 12 and 100 characters (inclusive).",
      });
  }

  // validate that user does not already exist
  try {
    result = await pool.query(
      "SELECT password FROM users WHERE username = $1",
      [username]
    );
  } catch (error) {
    console.log("SELECT FAILED", error);
    return res.status(500);
  }
  if (result.rows.length === 1) {
    return res
      .status(400)
      .json({ error: "A user with this 'username' already exists." });
  }

  // hash password
  let hash;
  try {
    hash = await argon2.hash(password);
  } catch (error) {
    console.log("HASH FAILED", error);
    return res.status(500).json({ error: "Something went wrong." });
  }

  console.log(hash); // TODO just for debugging
  // create user
  try {
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
      username,
      hash,
    ]);
  } catch (error) {
    console.log("INSERT FAILED", error);
    return res.status(500).json({ error: "Something went wrong." });
  }

  return res.status(200).json({});
});

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
