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

    socket.emit("roomJoined", roomId);
    io.to(roomId).emit("updateGame", rooms[roomId]);
  });

  socket.on("setTheme", (theme) => {
    const { roomId } = socket.data;
    if(!roomId) return;
    rooms[roomId].theme = theme;
    io.to(roomId).emit("updateGame", rooms[roomId]);
  });

  socket.on("startGame", ({ roomId }) => {
    if(!rooms[roomId]) return;
    const room = rooms[roomId];
    if(room.players.length < 2) return;
    if(!room.gameData){
      const scores = {};
      room.players.forEach(p => scores[p]=0);
      room.gameData = { players: room.players, scores, turnIndex:0, state:"setup", currentCard:null, history:[], guesserQueue:null, currentGuesserIndex:null, theme: room.theme };
    }
    io.to(roomId).emit("updateGame", room.gameData);
  });

  socket.on("updateGameState", (data) => {
    const { roomId } = socket.data;
    if(!roomId) return;
    rooms[roomId].gameData = data;
    io.to(roomId).emit("updateGame", data);
  });

  socket.on("disconnect", () => {
    const { roomId, playerName } = socket.data;
    if(roomId && rooms[roomId]){
      rooms[roomId].players = rooms[roomId].players.filter(p=>p!==playerName);
      io.to(roomId).emit("updateGame", rooms[roomId]);
    }
  });
});

server.listen(5000, () => console.log("Server running on http://localhost:5000"));
