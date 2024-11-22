import express from "express";
import cookieParser from "cookie-parser";
import http from "http";
import { fileURLToPath } from "url";
import { dirname } from "path";

process.chdir(dirname(fileURLToPath(import.meta.url)));

import accountRouter from "./account.js";
import { router as biddingRouter, addSockets } from "./biddingrooms.js";
import { router as marketRouter } from "./marketplace.js";

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

const server = http.createServer(app);
addSockets(server);

app.get("/", (req, res) => {
  return res.render("index");
});

server.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
