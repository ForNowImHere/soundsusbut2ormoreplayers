const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 5000;
const games = {}; // roomId -> game data

// serve static files
app.use(express.static(path.join(__dirname, "public")));

function generateRoomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("🟢 Player connected:", socket.id);

  socket.on("joinGame", ({ roomId, playerName }) => {
    if (!roomId) roomId = generateRoomCode();

    if (!games[roomId]) {
      games[roomId] = {
        players: [],
        scores: {},
        turnIndex: 0,
        state: "waiting",
      };
    }

    const game = games[roomId];
    if (!game.players.includes(playerName)) {
      game.players.push(playerName);
      game.scores[playerName] = 0;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerName = playerName;

    console.log(`👥 ${playerName} joined room ${roomId}`);

    io.to(roomId).emit("updateGame", game);
    socket.emit("roomJoined", roomId);
  });

  socket.on("updateGameState", (data) => {
    const roomId = socket.roomId;
    if (roomId && games[roomId]) {
      Object.assign(games[roomId], data);
      io.to(roomId).emit("updateGame", games[roomId]);
    }
  });

  socket.on("disconnect", () => {
    const { roomId, playerName } = socket;
    if (roomId && games[roomId]) {
      const game = games[roomId];
      game.players = game.players.filter((p) => p !== playerName);
      delete game.scores[playerName];
      io.to(roomId).emit("updateGame", game);
    }
    console.log("🔴 Player disconnected:", socket.id);
  });
});

server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
