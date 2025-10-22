// -----------------------------
// Sounds Sus Multiplayer Server
// -----------------------------
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 5000;

// -----------------------------
// In-memory game storage
// roomId -> gameData
// -----------------------------
const games = {};

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// -----------------------------
// Helper: Generate random room code
// -----------------------------
function generateRoomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// -----------------------------
// Socket.io connection
// -----------------------------
io.on("connection", (socket) => {
  console.log("🟢 Player connected:", socket.id);

  // Player joins or creates room
  socket.on("joinGame", ({ roomId, playerName }) => {
    if (!roomId) roomId = generateRoomCode();

    // Create room if not exists
    if (!games[roomId]) {
      games[roomId] = {
        players: [],
        scores: {},
        turnIndex: 0,
        state: "setup",
        currentCard: null,
        guesserQueue: null,
        currentGuesserIndex: null,
        history: [],
        theme: "classic"
      };
    }

    const game = games[roomId];

    // Add player if not exists
    if (!game.players.includes(playerName)) {
      game.players.push(playerName);
      game.scores[playerName] = 0;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerName = playerName;

    console.log(`👥 ${playerName} joined room ${roomId}`);

    // Notify everyone in room
    io.to(roomId).emit("updateGame", game);
    // Send room code to joining player
    socket.emit("roomJoined", roomId);
  });

  // Update game state from client
  socket.on("updateGameState", (data) => {
    const roomId = socket.roomId;
    if (roomId && games[roomId]) {
      // Merge incoming game data
      Object.assign(games[roomId], data);
      io.to(roomId).emit("updateGame", games[roomId]);
    }
  });

  // Handle player disconnect
  socket.on("disconnect", () => {
    const { roomId, playerName } = socket;
    if (roomId && games[roomId]) {
      const game = games[roomId];
      game.players = game.players.filter(p => p !== playerName);
      delete game.scores[playerName];

      // Delete room if empty
      if (game.players.length === 0) {
        delete games[roomId];
        console.log(`🗑️ Room ${roomId} deleted (empty)`);
      } else {
        io.to(roomId).emit("updateGame", game);
      }
    }
    console.log("🔴 Player disconnected:", socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
