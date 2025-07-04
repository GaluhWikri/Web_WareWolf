const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://web-warewolf.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json());

// Socket.IO setup
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

// In-memory storage (use Redis in production)
const gameRooms = new Map();
const playerSockets = new Map(); // playerId -> socketId mapping

// Utility functions
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return gameRooms.has(result) ? generateRoomCode() : result;
}

function createGameRoom(hostPlayer) {
  const roomCode = generateRoomCode();
  const room = {
    code: roomCode,
    host: hostPlayer.id,
    players: [hostPlayer],
    gameState: {
      phase: 'lobby',
      dayCount: 1,
      timeRemaining: 300,
      nightActions: {}
    },
    chatMessages: [
      {
        id: uuidv4(),
        player: 'Narrator',
        message: `Welcome to room ${roomCode}! Share this code with friends to join.`,
        type: 'system',
        timestamp: Date.now()
      }
    ],
    settings: {
      werewolves: 2,
      villagers: 4,
      seer: 1,
      doctor: 1,
      dayDuration: 300,
      nightDuration: 120
    },
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  
  gameRooms.set(roomCode, room);
  return room;
}

function broadcastToRoom(roomCode, event, data) {
  io.to(roomCode).emit(event, data);
}

function addChatMessage(roomCode, player, message, type = 'player') {
  const room = gameRooms.get(roomCode);
  if (!room) return;

  const newMessage = {
    id: uuidv4(),
    player,
    message,
    type,
    timestamp: Date.now()
  };

  room.chatMessages.push(newMessage);
  room.lastActivity = Date.now();
  
  broadcastToRoom(roomCode, 'chat-message', newMessage);
  broadcastToRoom(roomCode, 'room-update', room);
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create game room
  socket.on('create-room', (playerData, callback) => {
    try {
      const player = {
        id: uuidv4(),
        name: playerData.name,
        role: 'villager',
        isAlive: true,
        isHost: true,
        isReady: false,
        votes: 0
      };

      const room = createGameRoom(player);
      
      // Join socket room
      socket.join(room.code);
      playerSockets.set(player.id, socket.id);
      
      console.log(`Room created: ${room.code} by ${player.name}`);
      
      callback({
        success: true,
        roomCode: room.code,
        player: player,
        room: room
      });
    } catch (error) {
      console.error('Error creating room:', error);
      callback({ success: false, error: 'Failed to create room' });
    }
  });

  // Join existing room
  socket.on('join-room', (data, callback) => {
    try {
      const { roomCode, playerName } = data;
      const room = gameRooms.get(roomCode);

      if (!room) {
        return callback({ success: false, error: 'Room not found' });
      }

      if (room.players.length >= 12) {
        return callback({ success: false, error: 'Room is full' });
      }

      if (room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
        return callback({ success: false, error: 'Name already taken' });
      }

      if (room.gameState.phase !== 'lobby') {
        return callback({ success: false, error: 'Game already started' });
      }

      const player = {
        id: uuidv4(),
        name: playerName,
        role: 'villager',
        isAlive: true,
        isHost: false,
        isReady: false,
        votes: 0
      };

      room.players.push(player);
      room.lastActivity = Date.now();
      
      // Join socket room
      socket.join(roomCode);
      playerSockets.set(player.id, socket.id);

      console.log(`${playerName} joined room: ${roomCode}`);

      // Notify all players in room
      addChatMessage(roomCode, 'System', `${playerName} joined the game!`, 'system');
      
      callback({
        success: true,
        player: player,
        room: room
      });
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, error: 'Failed to join room' });
    }
  });

  // Player ready toggle
  socket.on('toggle-ready', (data) => {
    const { roomCode, playerId } = data;
    const room = gameRooms.get(roomCode);
    
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.isReady = !player.isReady;
        room.lastActivity = Date.now();
        broadcastToRoom(roomCode, 'room-update', room);
      }
    }
  });

  // Start game
  socket.on('start-game', (data) => {
    const { roomCode, settings } = data;
    const room = gameRooms.get(roomCode);
    
    if (!room) return;

    // Assign roles
    const roles = [];
    for (let i = 0; i < settings.werewolves; i++) roles.push('werewolf');
    for (let i = 0; i < settings.seer; i++) roles.push('seer');
    for (let i = 0; i < settings.doctor; i++) roles.push('doctor');
    for (let i = 0; i < settings.villagers; i++) roles.push('villager');
    
    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    
    room.players.forEach((player, index) => {
      player.role = roles[index] || 'villager';
      player.hasUsedAbility = false;
    });

    room.gameState = {
      phase: 'day',
      dayCount: 1,
      timeRemaining: settings.dayDuration,
      nightActions: {}
    };
    
    room.settings = settings;
    room.lastActivity = Date.now();

    addChatMessage(roomCode, 'Narrator', 'Roles have been assigned! The game begins now.', 'system');
    
    console.log(`Game started in room: ${roomCode}`);
  });

  // Chat message
  socket.on('send-message', (data) => {
    const { roomCode, playerId, message, type } = data;
    const room = gameRooms.get(roomCode);
    
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      if (player && player.isAlive) {
        addChatMessage(roomCode, player.name, message, type || 'player');
      }
    }
  });

  // Vote for player
  socket.on('vote-player', (data) => {
    const { roomCode, voterId, targetId } = data;
    const room = gameRooms.get(roomCode);
    
    if (room && room.gameState.phase === 'voting') {
      const voter = room.players.find(p => p.id === voterId);
      if (voter && voter.isAlive) {
        voter.votedFor = voter.votedFor === targetId ? undefined : targetId;
        room.lastActivity = Date.now();
        broadcastToRoom(roomCode, 'room-update', room);
      }
    }
  });

  // Use night ability
  socket.on('use-ability', (data) => {
    const { roomCode, playerId, targetId, ability } = data;
    const room = gameRooms.get(roomCode);
    
    if (room && room.gameState.phase === 'night') {
      const player = room.players.find(p => p.id === playerId);
      if (player && player.isAlive && !player.hasUsedAbility) {
        player.hasUsedAbility = true;
        room.gameState.nightActions[`${ability}Target`] = targetId;
        room.lastActivity = Date.now();
        
        if (ability === 'seer') {
          const target = room.players.find(p => p.id === targetId);
          if (target) {
            socket.emit('seer-result', {
              targetName: target.name,
              targetRole: target.role
            });
          }
        }
        
        broadcastToRoom(roomCode, 'room-update', room);
      }
    }
  });

  // Leave room
  socket.on('leave-room', (data) => {
    const { roomCode, playerId } = data;
    const room = gameRooms.get(roomCode);
    
    if (room) {
      const playerIndex = room.players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        // Remove from socket mapping
        playerSockets.delete(playerId);
        socket.leave(roomCode);
        
        // Transfer host if needed
        if (room.host === playerId && room.players.length > 0) {
          room.host = room.players[0].id;
          room.players[0].isHost = true;
          addChatMessage(roomCode, 'System', `${room.players[0].name} is now the host.`, 'system');
        }
        
        // Delete room if empty
        if (room.players.length === 0) {
          gameRooms.delete(roomCode);
          console.log(`Room deleted: ${roomCode}`);
        } else {
          addChatMessage(roomCode, 'System', `${player.name} left the game.`, 'system');
        }
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find and remove player from any room
    for (const [playerId, socketId] of playerSockets) {
      if (socketId === socket.id) {
        // Find room containing this player
        for (const [roomCode, room] of gameRooms) {
          const playerIndex = room.players.findIndex(p => p.id === playerId);
          if (playerIndex !== -1) {
            const player = room.players[playerIndex];
            room.players.splice(playerIndex, 1);
            
            // Transfer host if needed
            if (room.host === playerId && room.players.length > 0) {
              room.host = room.players[0].id;
              room.players[0].isHost = true;
              addChatMessage(roomCode, 'System', `${room.players[0].name} is now the host.`, 'system');
            }
            
            // Delete room if empty
            if (room.players.length === 0) {
              gameRooms.delete(roomCode);
              console.log(`Room deleted: ${roomCode}`);
            } else {
              addChatMessage(roomCode, 'System', `${player.name} disconnected.`, 'system');
            }
            break;
          }
        }
        playerSockets.delete(playerId);
        break;
      }
    }
  });
});

// REST API endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    rooms: gameRooms.size,
    players: playerSockets.size
  });
});

app.get('/stats', (req, res) => {
  res.json({
    totalRooms: gameRooms.size,
    totalPlayers: playerSockets.size,
    rooms: Array.from(gameRooms.values()).map(room => ({
      code: room.code,
      playerCount: room.players.length,
      phase: room.gameState.phase,
      createdAt: room.createdAt
    }))
  });
});

// Cleanup old rooms every 30 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours
  
  for (const [code, room] of gameRooms) {
    if (now - room.lastActivity > maxAge) {
      gameRooms.delete(code);
      console.log(`Cleaned up old room: ${code}`);
    }
  }
}, 30 * 60 * 1000);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Werewolf Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});