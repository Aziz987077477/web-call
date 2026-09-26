const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// Реестр пользователей: phone -> { phone, name, socketId, online }
const registeredUsers = {};

io.on('connection', (socket) => {
  
  // Авторизация / Регистрация по номеру
  socket.on('register', ({ name, phone }) => {
    socket.phone = phone;
    registeredUsers[phone] = {
      phone,
      name,
      socketId: socket.id,
      online: true
    };

    // Рассылаем обновленный список контактов всем онлайн пользователям
    io.emit('contacts-list', Object.values(registeredUsers));
  });

  // Отправка личного сообщения в чате 1 на 1
  socket.on('send-private-msg', ({ toPhone, text }) => {
    const recipient = registeredUsers[toPhone];
    const sender = registeredUsers[socket.phone];

    const messageData = {
      fromPhone: socket.phone,
      senderName: sender ? sender.name : 'Контакты',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Отправляем получателю
    if (recipient && recipient.socketId) {
      io.to(recipient.socketId).emit('receive-private-msg', messageData);
    }
  });

  // Инициирование вызова (Аудио или Видео)
  socket.on('call-user', ({ targetPhone, offer, callType }) => {
    const target = registeredUsers[targetPhone];
    const caller = registeredUsers[socket.phone];

    if (target && target.socketId) {
      io.to(target.socketId).emit('incoming-call', {
        fromPhone: socket.phone,
        callerName: caller ? caller.name : 'Неизвестный',
        offer,
        callType
      });
    }
  });

  // Принятие вызова
  socket.on('accept-call', ({ targetPhone, answer }) => {
    const target = registeredUsers[targetPhone];
    if (target && target.socketId) {
      io.to(target.socketId).emit('call-accepted', { answer });
    }
  });

  // Отклонение / завершение вызова
  socket.on('end-call', ({ targetPhone }) => {
    const target = registeredUsers[targetPhone];
    if (target && target.socketId) {
      io.to(target.socketId).emit('call-ended');
    }
  });

  // WebRTC ICE кандидаты
  socket.on('ice-candidate', ({ targetPhone, candidate }) => {
    const target = registeredUsers[targetPhone];
    if (target && target.socketId) {
      io.to(target.socketId).emit('ice-candidate', { candidate });
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    if (socket.phone && registeredUsers[socket.phone]) {
      registeredUsers[socket.phone].online = false;
      io.emit('contacts-list', Object.values(registeredUsers));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`WhatsApp Server запущен на порту ${PORT}`));