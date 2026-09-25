const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static('public'));

// Хранилище подключенных пользователей: socket.id -> { userName, role }
const users = {};

io.on('connection', (socket) => {
  socket.on('join-room', ({ room, userName, role }) => {
    socket.join(room);
    socket.room = room;
    users[socket.id] = { userName, role };

    // Получаем список остальных участников комнаты
    const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(room) || [])
      .filter(id => id !== socket.id)
      .map(id => ({ socketId: id, user: users[id] }));

    // Отправляем новому участнику список тех, кто уже в комнате
    socket.emit('all-users', clientsInRoom);

    // Уведомляем остальных о подключении нового участника
    socket.to(room).emit('user-joined', {
      socketId: socket.id,
      user: users[socket.id]
    });
  });

  // Сигналинг WebRTC
  socket.on('offer', ({ target, offer }) => {
    io.to(target).emit('offer', {
      caller: socket.id,
      user: users[socket.id],
      offer
    });
  });

  socket.on('answer', ({ target, answer }) => {
    io.to(target).emit('answer', {
      responder: socket.id,
      answer
    });
  });

  socket.on('ice-candidate', ({ target, candidate }) => {
    io.to(target).emit('ice-candidate', {
      sender: socket.id,
      candidate
    });
  });

  // Текстовый чат
  socket.on('chat-message', (msg) => {
    if (socket.room && users[socket.id]) {
      io.to(socket.room).emit('chat-message', {
        user: users[socket.id].userName,
        role: users[socket.id].role,
        text: msg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    if (socket.room) {
      socket.to(socket.room).emit('user-left', socket.id);
    }
    delete users[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});