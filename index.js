const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ["GET", "POST"]// Allow requests from any origin
  },
});

let users = {};
io.use((socket, next) => {
  if (socket.handshake.query) { // Here we are not getting callerId
    let callerId = socket.handshake.query.callerId;
    socket.user = callerId;
    next();
  }
});

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
  socket.join(socket.id);
  socket.on('register', (name) => {
    users[socket.id] = name;
    console.log('User registered:', name);
    io.emit('updateUserList', Object.values(users));
  });
  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('updateUserList', Object.values(users));
    console.log('Client disconnected');
  });

  socket.on('makeCall', (data) => {
    const { caller, calleeId ,sdpOffer} = data;
    const calleeSocketId = Object.keys(users).find(key => users[key] === calleeId);
    if (calleeSocketId) {
      socket.to(calleeSocketId).emit('newCall', {callerId: socket.id, sdpOffer: sdpOffer });
    }
    else{
      console.log('Error happen while Making Call')
    }
  });

  socket.on('answerCall', (data) => {
    const { callerId, sdpAnswer } = data;
    //const callerSocketId = Object.keys(users).find(key => users[key] === callerId);
    if (callerId) {
      socket.to(callerId).emit('callAnswered', { callee: socket.id, sdpAnswer:sdpAnswer });
    }
    else{
      console.log('Error happen while Making Call')
    }
  });
  socket.on('IceCandidate', (data) => {
    const { calleeId, iceCandidate } = data;
    const calleeSocketId = Object.keys(users).find(key => users[key] === calleeId);
    if (calleeSocketId) {
      socket.to(calleeSocketId).emit('IceCandidate', { 
        sender: socket.id,
        iceCandidate: iceCandidate,
       });
    }
  });
});
server.listen(5000, '0.0.0.0', () => {
  console.log('Server listening on port 5000');
});