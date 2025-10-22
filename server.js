const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {}; // { roomId: { players: [], theme, gameData } }

function makeRoomCode() {
  return Math.random().toString(36).substring(2,7).toUpperCase();
}

io.on("connection", socket => {
  console.log("New connection:", socket.id);

  socket.on("joinGame", ({ roomId, playerName }) => {
    if(!roomId) roomId = makeRoomCode();
    if(!rooms[roomId]) rooms[roomId] = { players: [], theme:"classic", gameData:null };

    socket.join(roomId);

    if(!rooms[roomId].players.includes(playerName)) rooms[roomId].players.push(playerName);
    socket.data = { roomId, playerName };

    // Send room info + gameData separately
    socket.emit("roomJoined", { roomId, theme: rooms[roomId].theme });
    io.to(roomId).emit("updateRoom", { players: rooms[roomId].players, theme: rooms[roomId].theme, gameData: rooms[roomId].gameData });
  });

  socket.on("setTheme", (theme) => {
    const { roomId } = socket.data;
    if(!roomId) return;
    rooms[roomId].theme = theme;

    // Broadcast updated theme without breaking gameData
    io.to(roomId).emit("updateRoom", { players: rooms[roomId].players, theme: rooms[roomId].theme, gameData: rooms[roomId].gameData });
  });

  socket.on("startGame", () => {
    const { roomId } = socket.data;
    if(!roomId) return;
    const room = rooms[roomId];
    if(room.players.length < 2) return;

    // Initialize new gameData for this room only
    const scores = {};
    room.players.forEach(p => scores[p] = 0);
    room.gameData = {
      players: room.players,
      scores,
      turnIndex: 0,
      state: "setup",
      currentCard: null,
      history: [],
      guesserQueue: null,
      currentGuesserIndex: null,
      theme: room.theme
    };

    io.to(roomId).emit("updateRoom", { players: room.players, theme: room.theme, gameData: room.gameData });
  });

  socket.on("updateGameState", (gameData) => {
    const { roomId } = socket.data;
    if(!roomId) return;
    if(!rooms[roomId]) return;

    // Update only the gameData for this room
    rooms[roomId].gameData = gameData;

    // Broadcast updated gameData to all clients in room
    io.to(roomId).emit("updateRoom", { players: rooms[roomId].players, theme: rooms[roomId].theme, gameData });
  });

  socket.on("disconnect", () => {
    const { roomId, playerName } = socket.data;
    if(roomId && rooms[roomId]){
      rooms[roomId].players = rooms[roomId].players.filter(p=>p!==playerName);
      io.to(roomId).emit("updateRoom", { players: rooms[roomId].players, theme: rooms[roomId].theme, gameData: rooms[roomId].gameData });
    }
  });
});

server.listen(5000, () => console.log("Server running on http://localhost:5000"));
