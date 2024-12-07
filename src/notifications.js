import express from "express";
import pool from "./database.js";
import { authorize } from "./account.js";

const router = express.Router();
const notifications = {};

router.get("/", authorize, (req, res) => {
  let id = req.params["user"];

  if (!notifications.hasOwnProperty(id)) {
    return res.status(400).send(false);
  }

  return res.send(notifications[id]);
});

async function initializeNotifications() {
  try {
    let result = await pool.query("SELECT id FROM users;");

    for (let user of result.rows) {
      notifications[user.id] = false;
    }
  } catch (error) {
    console.log(error);
  }
}

function addNewUser(newUserId) {
  notifications[newUserId] = false;
}

function setNotification(userId, status) {
  if (notifications.hasOwnProperty(userId)) {
    notifications[userId] = status;
  }
}

initializeNotifications();

export default router;
export { router, addNewUser, setNotification };
