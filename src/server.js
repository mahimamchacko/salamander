let express = require("express");
let argon2 = require("argon2");
let crypto = require("crypto");
let cookieParser = require("cookie-parser");
let env = require("../env.json");
let ejs = require("ejs");
let uuid = require("uuid");
let http = require("http");
let { Server } = require("socket.io");
let pool = require("./database");

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
app.use(cookieParser());

const server = http.createServer(app);
const io = new Server(server);

/**
 * @type {{ id: string, title: string, content: string }[]}
 */
const posts = [];

app.get("/", (req, res) => {
  return res.render("index", { posts });
});

app.get("/account/create", (req, res) => {
  return res.render("account-create");
});

app.get("/account/login", (req, res) => {
  return res.render("account-login");
});

let cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
};

app.post("/account/create", async (req, res) => {
  // validate that request body contains arguments
  if (
    !req.body.hasOwnProperty("username") ||
    !req.body.hasOwnProperty("password")
  ) {
    console.log(
      "The arguments 'username' and 'password' must exist in the request body."
    );
    return res.sendStatus(400).json({
      message:
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
    console.log(
      "The arguments 'username' must be between 6 and 50 characters (inclusive) and 'password' must be between 12 and 100 characters (inclusive)."
    );
    console.log("Username: " + username);
    console.log("Password: " + password);
    return res.status(400).json({
      message:
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
    return res.status(500).json({ message: "Something went wrong." });
  }
  if (result.rows.length === 1) {
    console.log("A user with this 'username' already exists.");
    return res
      .status(400)
      .json({ message: "A user with this 'username' already exists." });
  }

  // hash password
  let hash;
  try {
    hash = await argon2.hash(password);
  } catch (error) {
    console.log("HASH FAILED", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
  console.log("A user with this 'username' does not exist.");
  console.log("Username: " + username);
  console.log("Password: " + password);
  console.log("Hash: " + hash);

  // create user
  try {
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
      username,
      hash,
    ]);
  } catch (error) {
    console.log("INSERT FAILED", error);
    return res.status(500).json({ message: "Something went wrong." });
  }

  return res.status(200).json({ message: "Account successfully created." });
});

app.post("/account/login", async (req, res) => {
  // validate that request body contains arguments
  if (
    !req.body.hasOwnProperty("username") ||
    !req.body.hasOwnProperty("password")
  ) {
    console.log(
      "The arguments 'username' and 'password' must exist in the request body."
    );
    console.log(req.body);
    return res.sendStatus(400).json({
      message:
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
    console.log(
      "The arguments 'username' must be between 6 and 50 characters (inclusive) and 'password' must be between 12 and 100 characters (inclusive)."
    );
    console.log("Username: " + username);
    console.log("Password: " + password);
    return res.status(400).json({
      message:
        "The arguments 'username' must be between 6 and 50 characters (inclusive) and 'password' must be between 12 and 100 characters (inclusive).",
    });
  }

  // validate that user does exist
  try {
    result = await pool.query(
      "SELECT password FROM users WHERE username = $1",
      [username]
    );
  } catch (error) {
    console.log("SELECT FAILED", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
  if (result.rows.length === 0) {
    console.log("A user with this 'username' does not exist.");
    return res
      .status(400)
      .json({ message: "A user with this 'username' does not exist." });
  }

  let hash = result.rows[0].password;
  console.log("A user with this 'username' does exist.");
  console.log("Username: " + username);
  console.log("Password: " + password);
  console.log("Hash: " + hash);

  // verify hash
  let verification;
  try {
    verification = await argon2.verify(hash, password);
  } catch (error) {
    console.log("VERIFY FAILED", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
  if (!verification) {
    console.log("The 'password' for 'username' does not match.");
    return res
      .status(400)
      .json({ message: "The 'password' for 'username' does not match." });
  }

  // create token
  let token = req.cookies;
  console.log("Token: " + token);
  if (token === undefined) {
    token = crypto.randomBytes(32).toString("hex");
    try {
      await pool.query("INSERT INTO tokens (token) VALUES ($1)", [token]);
    } catch (error) {
      console.log("INSERT FAILED", error);
      return res.status(500).json({ message: "Something went wrong." });
    }
    console.log("Token: " + token);
  }

  return res.cookie("token", token, cookieOptions).send();
});

app.post("/logout", async (req, res) => {
  let token = req.cookies;
  console.log("Token: " + token);

  // validate that the token does exist
  if (token === undefined) {
    console.log("The account is already logged out.");
    return res
      .status(400)
      .json({ message: "The account is already logged out." });
  }

  try {
    result = await pool.query("SELECT password FROM tokens WHERE token = $1", [
      token,
    ]);
  } catch (error) {
    console.log("SELECT FAILED", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
  if (result.rows.length === 0) {
    console.log("This token does not exist.");
    return res.status(400).json({ message: "This token does not exist." });
  }

  // delete token
  try {
    result = await pool.query("DELETE FROM tokens WHERE token = $1", [token]);
  } catch (error) {
    console.log("DELETE FAILED", error);
    return res.status(500).json({ message: "Something went wrong." });
  }

  return res.clearCookie("token", cookieOptions).send();
});

app.get("/biddingroom/:roomId", (req, res) => {
  const { roomId } = req.params;
  return res.render("biddingroom", { roomId });
});

app.get("/biddingroom/:roomId", (req, res) => {
  const { roomId } = req.params;
  return res.render("biddingroom", { roomId });
});

/** @type {{ [roomId: string]: number } */
const rooms = {};

/**
 * @param {boolean} success
 * @param {string} msg
 * @returns {{ success: boolean, msg: string }}
 */
function createSocketRes(success, msg) {
  return { success: success, msg: msg };
}

io.on("connection", (socket) => {
  console.log("client connected");
  socket.on("join room", (id, callback) => {
    if (socket.rooms.size > 1) {
      console.log("already in a room");
      callback(createSocketRes(false, "already in a room"));
      return;
    }

    if (!id) {
      callback(createSocketRes(false, "no room id"));
      return;
    }

    if (!rooms[id]) {
      rooms[id] = 0;
    }

    socket.join(id);
    callback(createSocketRes(true, rooms[id]));
  });

  socket.on("make bid", (message, callback) => {
    if (socket.rooms.size < 2) {
      callback(createSocketRes(false, "not in a room"));
      return;
    }

    const { roomId, amount: amountString } = message;
    const amount = Number(amountString);

    if (!roomId || !amountString || Number.isNaN(amount)) {
      callback(createSocketRes(false, "no room ID or amount"));
      return;
    }

    callback(createSocketRes(true, null));

    if (amount > rooms[roomId]) {
      rooms[roomId] = amount;
      io.to(roomId).emit("new bid", amount);
    }
  });
});

server.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
