import express from "express";
import { Server } from "socket.io";

const router = express.Router();

/** @type {{ [postId: string]: number } */
const rooms = {};

router.get("/:roomId", (req, res) => {
  const { roomId } = req.params;
  if (!rooms[roomId]) {
    return res.status(404).send("Room not found");
  }
  return res.render("biddingroom", { roomId });
});

/**
 * @param {boolean} success
 * @param {string} msg
 * @returns {{ success: boolean, msg: string }}
 */
function createSocketRes(success, msg) {
  return { success: success, msg: msg };
}

/** @type {Server} */
let io;

/**
 * @param {express.Express} server
 */
function addSockets(server) {
  if (io) {
    return;
  }

  io = new Server(server);

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
}

/**
 * @param {string} postId
 * @param {number} startBid
 * @param {string} startTime
 * @param {string} endTime
 */
function addRoom(postId, startBid, startTime, endTime) {
  rooms[postId] = startBid;
  console.log(startTime, endTime);
}

export { router, addSockets, addRoom };
