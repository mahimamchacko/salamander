let express = require("express");
let argon2 = require("argon2");
let cookieParser = require("cookie-parser");
let env = require("../env.json");
let ejs = require("ejs");
let { Pool } = require("pg");
let uuid = require("uuid");
let http = require("http");
let { Server } = require("socket.io");

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

const server = http.createServer(app);
const io = new Server(server);

/**
 * @type {{ id: string, title: string, content: string }[]}
 */
const posts = [];

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
