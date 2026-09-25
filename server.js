const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static('public'));

io.on('connection', (socket) => {
  socket.on('join-room', (role) => {
    socket.join('call-room');
    socket.role = role;
    socket.to('call-room').emit('user-connected', role);
  });

  socket.on('offer', (data) => {
    socket.to('call-room').emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.to('call-room').emit('answer', data);
  });

  socket.on('ice-candidate', (candidate) => {
    socket.to('call-room').emit('ice-candidate', candidate);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});