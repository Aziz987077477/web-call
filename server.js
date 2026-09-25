const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// Храним онлайн-пользователей: { socketId: { userName, role } }
const onlineUsers = {};

io.on('connection', (socket) => {
  // Авторизация пользователя
  socket.on('register-user', ({ userName, role }) => {
    onlineUsers[socket.id] = { socketId: socket.id, userName, role };
    io.emit('update-user-list', Object.values(onlineUsers));
  });

  // Запрос на звонок (от одного к другому)
  socket.on('call-user', ({ userToCall, offer }) => {
    io.to(userToCall).emit('incoming-call', {
      from: socket.id,
      caller: onlineUsers[socket.id],
      offer
    });
  });

  // Ответ на звонок (принятие)
  socket.on('accept-call', ({ to, answer }) => {
    io.to(to).emit('call-accepted', { answer });
  });

  // Отклонение или завершение звонка
  socket.on('end-call', ({ to }) => {
    io.to(to).emit('call-ended');
  });

  // ICE кандидаты
  socket.on('ice-candidate', ({ target, candidate }) => {
    io.to(target).emit('ice-candidate', { candidate });
  });

  // Личные сообщения в чате
  socket.on('private-message', ({ to, text }) => {
    const sender = onlineUsers[socket.id];
    io.to(to).emit('private-message', {
      sender: sender ? sender.userName : 'Собеседник',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // Отключение
  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    io.emit('update-user-list', Object.values(onlineUsers));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));