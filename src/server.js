import express from "express";
import cookieParser from "cookie-parser";
import http from "http";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { authorize } from "./account.js";

process.chdir(dirname(fileURLToPath(import.meta.url)));

import accountRouter from "./account.js";
import {
  router as biddingRouter,
  addSockets,
  loadRooms,
} from "./biddingrooms.js";
import { router as marketRouter } from "./market.js";
import { router as notifRouter } from "./notifications.js";

let port = 3000;
let hostname;
if (process.env.NODE_ENV == "production") {
  hostname = "0.0.0.0";
} else {
  hostname = "localhost";
}

let app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());

app.use("/account/", accountRouter);
app.use("/biddingroom/", biddingRouter);
app.use("/market/", marketRouter);
app.use("/notification/", notifRouter);

const server = http.createServer(app);
addSockets(server);

await loadRooms();

app.get("/", authorize, (_req, res) => {
  return res.redirect(307, "/market");
});

server.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
