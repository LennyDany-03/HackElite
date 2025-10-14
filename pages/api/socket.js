// pages/api/socket.js
import { Server as SocketIOServer } from "socket.io";

export const config = {
  api: { bodyParser: false },
};

export default function handler(req, res) {
  // Reuse existing server.io instance if already created
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: { origin: "*" },
    });
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      socket.on("join", (room) => {
        if (typeof room === "string" && room.length) socket.join(room);
      });

      socket.on("message:send", (room, payload) => {
        if (typeof room === "string" && room.length) {
          io.to(room).emit("message:new", payload);
        }
      });

      socket.on("typing", (room, state) => {
        if (typeof room === "string" && room.length) {
          socket.to(room).emit("typing", state);
        }
      });

      socket.on("file:send", (room, payload) => {
        if (typeof room === "string" && room.length) {
          io.to(room).emit("file:new", payload);
        }
      });
    });
  }

  res.status(200).end();
}
