import { io } from "https://cdn.socket.io/4.8.0/socket.io.esm.min.js"
const amountElem = document.getElementById("amount");
const maxBidElem = document.getElementById("max-bid");

const socket = io();

socket.emit("join room", roomId, ({ success, msg }) => {
    if (!success) {
        console.error(msg);
        return;
    }

    maxBidElem.textContent = msg;
});

document.getElementById("sender").addEventListener("click", () => {
    socket.emit("make bid", { roomId: roomId, amount: amountElem.value }, ({ success, msg }) => {
        if (!success) {
            console.error(msg);
            return;
        }
    });
});

socket.on("new bid", (bid) => {
    console.log(bid);
    maxBidElem.textContent = bid;
});
