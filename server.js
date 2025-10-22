const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {}; // { roomId: { players: [], theme: 'classic', gameData: {...} } }

function makeRoomCode() {
  return Math.random().toString(36).substring(2,7).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("joinGame", ({roomId, playerName}) => {
    if(!roomId) roomId = makeRoomCode();
    if(!rooms[roomId]) rooms[roomId] = { players: [], theme:"classic", gameData:null };
    
    socket.join(roomId);

    // Avoid duplicate player names
    if(!rooms[roomId].players.includes(playerName)) rooms[roomId].players.push(playerName);

    // Store player info in socket
    socket.data = { roomId, playerName };

    // Send back room joined info
    socket.emit("roomJoined", roomId);

    // Update all clients in room
    io.to(roomId).emit("updateGame", rooms[roomId]);
  });

  socket.on("updateGameState", (data) => {
    const { roomId } = socket.data;
    if(!roomId) return;
    rooms[roomId].gameData = data;
    io.to(roomId).emit("updateGame", data);
  });

  socket.on("setTheme", (theme) => {
    const { roomId } = socket.data;
    if(!roomId) return;
    rooms[roomId].theme = theme;
    io.to(roomId).emit("updateGame", rooms[roomId]);
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
