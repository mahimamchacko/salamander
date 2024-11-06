let express = require("express");
let cookieParser = require("cookie-parser");
let env = require("../env.json");
let ejs = require("ejs");
let uuid = require("uuid");
let http = require("http");
let { Server } = require("socket.io");

let pool = require("./database");
let authRouter = require("./auth");

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

app.use("/account/", authRouter);

const server = http.createServer(app);
const io = new Server(server);

/**
 * @type {{ id: string, title: string, content: string }[]}
 */
const posts = [];

app.get("/", (req, res) => {
  return res.render("index", { posts });
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
