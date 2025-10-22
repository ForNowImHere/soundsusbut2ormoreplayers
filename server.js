const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let games = {}; // store all active rooms

// Helper function to generate 6-character random room codes
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("⚡ Player connected:", socket.id);

  // Player joins or creates a game room
  socket.on("joinGame", ({ roomId, playerName }) => {
    if (!roomId) roomId = generateRoomCode();

    if (!games[roomId]) {
      games[roomId] = {
        players: [],
        scores: {},
        turnIndex: 0,
        state: "setup",
        currentCard: null,
        history: [],
        theme: "classic"
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

    console.log(`🎭 ${playerName} joined room ${roomId}`);

    socket.emit("roomJoined", roomId);
    io.to(roomId).emit("updateGame", game);
  });

  // Update full game state
  socket.on("updateGameState", (newData) => {
    const roomId = socket.roomId;
    const game = games[roomId];
    if (game) {
      Object.assign(game, newData);
      io.to(roomId).emit("updateGame", game);
    }
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    const { roomId, playerName } = socket;
    if (roomId && games[roomId]) {
      const game = games[roomId];
      game.players = game.players.filter(p => p !== playerName);
      delete game.scores[playerName];
      io.to(roomId).emit("updateGame", game);
    }
    console.log("👋 Player disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Sounds Sus server running on http://localhost:${PORT}`));
