import { io } from "https://cdn.socket.io/4.8.0/socket.io.esm.min.js";
const amountElem = document.getElementById("amount");
const maxBidElem = document.getElementById("max-bid");

const socket = io();

socket.emit("join room", roomId, ({ success, msg }) => {
  if (!success) {
    console.error(msg);
    return;
  }

  if (maxBidElem && amountElem) {
    maxBidElem.textContent = msg.maxBid;
    amountElem.value = msg.maxBid;
  }
});

document.getElementById("sender")?.addEventListener("click", () => {
  socket.emit(
    "make bid",
    { roomId: roomId, userId: userId, amount: amountElem?.value },
    ({ success, msg }) => {
      if (!success) {
        console.error(msg);
        return;
      }
    },
  );
});

socket.on("new bid", (bid) => {
  console.log(bid);
  if (maxBidElem && amountElem) {
    maxBidElem.textContent = bid;
    amountElem.value = bid;
  }
});

socket.on("bidding over", (msg) => {
  console.log(msg);
  if (amountElem) {
    amountElem.disabled = true;
  }
  const sender = document.getElementById("sender");
  sender.parentNode.removeChild(sender);
});
