import express from "express";
import { Server } from "socket.io";
import pool from "./database.js";
import { setNotification } from "./notifications.js";

const router = express.Router();

/** @type {{ [postId: string]: { maxBid: number, maxBidId?: string, isOpen: boolean} } */
const rooms = {};

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

      const { roomId, userId, amount: amountString } = message;
      const amount = Number(amountString);

      if (!roomId || !amountString || Number.isNaN(amount)) {
        callback(createSocketRes(false, "no room ID or amount"));
        return;
      }

      callback(createSocketRes(true, null));

      if (amount > rooms[roomId].maxBid) {
        rooms[roomId] = { maxBid: amount, maxBidId: userId, isOpen: true };
        io.to(roomId).emit("new bid", amount);
      }
    });
  });
}

/**
 * @param {string} postId
 * @param {number} startBid
 * @param {Date} startTime
 * @param {Date} endTime
 */
function addRoom(postId, startBid, startTime, endTime) {
  const now = new Date();

  if (startTime > now) {
    setTimeout(() => {
      rooms[postId].isOpen = true;
    }, startTime - now);
  }

  if (endTime > now) {
    setTimeout(() => {
      const room = rooms[postId];
      room.isOpen = false;
      if (!room.maxBidId) {
        return;
      }

      io.to(postId.toString()).emit("bidding over", room);

      pool.query(
        `
          UPDATE products
          SET price = $2, winner_id = $3
          WHERE id = $1;
        `,
        [postId, room.maxBid, room.maxBidId]
      );

      if (!io) {
        return;
      }

      io.to(postId).emit("bidding over", room);

      let winnerIdInt = Number.parseInt(room.maxBidId);
      if (Number.isInteger(winnerIdInt)) {
        setNotification(winnerIdInt, true);
      }
    }, endTime - now);
  }

  const isOpen = startTime <= now && endTime > now;

  rooms[postId] = { maxBid: startBid, isOpen: isOpen };
}

function getRoom(id) {
  return rooms[id];
}

async function loadRooms() {
  try {
    /** @type {{ rows: { id: string, price: string, start: string, close: string }[]}} */
    let { rows: posts } = await pool.query(
      `
        SELECT
            id,
            price,
            start_time as start,
            closing_time as close
        FROM products
        ;
    `
    );

    for (const post of posts) {
      addRoom(post.id, post.price, new Date(post.start), new Date(post.close));
    }
  } catch (err) {
    console.error("error loading rooms", err);
  }
}

export { router, addSockets, addRoom, getRoom, loadRooms };
