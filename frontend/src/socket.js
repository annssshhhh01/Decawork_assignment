import { io } from "socket.io-client";

const socket = io("https://decawork-assignment.onrender.com", {
  transports: ["websocket"],
  autoConnect: true,
});

export default socket;
