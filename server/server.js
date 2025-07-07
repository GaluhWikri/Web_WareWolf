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

// Konfigurasi CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://web-warewolf.vercel.app'] // Ganti dengan URL frontend production Anda
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json());

// Pengaturan Socket.IO
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Penyimpanan dalam memori
const gameRooms = new Map();
const playerSockets = new Map();

// ===============================================
// MESIN PERMAINAN & GAME LOOP
// ===============================================

const gameLoopIntervals = new Map();

function startGameLoop(roomCode) {
  if (gameLoopIntervals.has(roomCode)) {
    clearInterval(gameLoopIntervals.get(roomCode));
  }

  const loop = setInterval(() => {
    const room = gameRooms.get(roomCode);
    if (!room || room.gameState.winner) {
      clearInterval(loop);
      gameLoopIntervals.delete(roomCode);
      return;
    }

    if (room.gameState.timeRemaining > 0) {
      room.gameState.timeRemaining--;
    }

    // Hanya broadcast jika ada perubahan waktu, untuk efisiensi
    if (room.gameState.timeRemaining > 0) {
        broadcastToRoom(roomCode, 'room-update', room);
    } else {
        advanceGamePhase(roomCode);
    }
  }, 1000);

  gameLoopIntervals.set(roomCode, loop);
}

function advanceGamePhase(roomCode) {
  const room = gameRooms.get(roomCode);
  if (!room || room.gameState.winner) return;

  // Proses hasil dari fase sebelumnya
  switch (room.gameState.phase) {
    case 'voting':
      processVotes(roomCode);
      break;
    case 'night':
      processNightActions(roomCode);
      break;
  }
  
  // Periksa kondisi kemenangan setelah memproses fase
  if (checkWinConditions(roomCode)) return;

  // Pindah ke fase berikutnya
  switch (room.gameState.phase) {
    case 'day':
      room.gameState.phase = 'voting';
      room.gameState.timeRemaining = 45; // Waktu voting
      addChatMessage(roomCode, 'Narrator', 'Waktu vote dimulai! Pilih siapa yang akan dieliminasi.', 'system');
      break;
    case 'voting':
      room.gameState.phase = 'night';
      room.gameState.timeRemaining = room.settings.nightDuration;
      room.gameState.dayCount++;
      room.players.forEach(p => { p.hasUsedAbility = false; p.votedFor = undefined; });
      addChatMessage(roomCode, 'Narrator', `Malam telah tiba untuk hari ke-${room.gameState.dayCount}.`, 'system');
      break;
    case 'night':
      room.gameState.phase = 'day';
      room.gameState.timeRemaining = room.settings.dayDuration;
      addChatMessage(roomCode, 'Narrator', 'Matahari terbit. Diskusikan apa yang terjadi semalam.', 'system');
      break;
    default:
      room.gameState.phase = 'day';
      room.gameState.timeRemaining = room.settings.dayDuration;
      break;
  }

  broadcastToRoom(roomCode, 'room-update', room);
}

function processVotes(roomCode) {
    const room = gameRooms.get(roomCode);
    if (!room) return;
    const voteCounts = new Map();
    room.players.forEach(p => {
        if (p.isAlive && p.votedFor) {
            voteCounts.set(p.votedFor, (voteCounts.get(p.votedFor) || 0) + 1);
        }
    });

    let maxVotes = 0;
    let eliminatedPlayerId = null;
    let isTie = false;

    for (const [playerId, count] of voteCounts.entries()) {
        if (count > maxVotes) {
            maxVotes = count;
            eliminatedPlayerId = playerId;
            isTie = false;
        } else if (count === maxVotes && maxVotes > 0) {
            isTie = true;
        }
    }

    if (eliminatedPlayerId && !isTie) {
        const eliminatedPlayer = room.players.find(p => p.id === eliminatedPlayerId);
        if (eliminatedPlayer) {
            eliminatedPlayer.isAlive = false;
            addChatMessage(roomCode, 'Narrator', `${eliminatedPlayer.name} telah dieliminasi oleh warga. Dia adalah seorang ${eliminatedPlayer.role}.`, 'system');
        }
    } else {
        addChatMessage(roomCode, 'Narrator', 'Voting berakhir seri. Tidak ada yang dieliminasi hari ini.', 'system');
    }
}

function processNightActions(roomCode) {
    const room = gameRooms.get(roomCode);
    if (!room) return;
    const { werewolf, doctor } = room.gameState.nightActions;

    if (werewolf && werewolf !== doctor) {
        const targetPlayer = room.players.find(p => p.id === werewolf);
        if (targetPlayer) {
            targetPlayer.isAlive = false;
            addChatMessage(roomCode, 'Narrator', `Malam ini, ${targetPlayer.name} telah menjadi korban serangan werewolf!`, 'system');
        }
    } else if (werewolf && werewolf === doctor) {
        addChatMessage(roomCode, 'Narrator', 'Dokter berhasil menyelamatkan target serangan werewolf malam ini!', 'system');
    } else {
        addChatMessage(roomCode, 'Narrator', 'Malam ini berlalu dengan tenang, tidak ada serangan.', 'system');
    }
    
    room.gameState.nightActions = {};
}

function checkWinConditions(roomCode) {
    const room = gameRooms.get(roomCode);
    if (!room) return false;
    const alivePlayers = room.players.filter(p => p.isAlive);
    const werewolfCount = alivePlayers.filter(p => p.role === 'werewolf').length;
    const villagerCount = alivePlayers.length - werewolfCount;

    let winner = null;
    if (werewolfCount === 0) {
        winner = 'villagers';
    } else if (werewolfCount >= villagerCount) {
        winner = 'werewolves';
    }

    if (winner) {
        room.gameState.winner = winner;
        if (gameLoopIntervals.has(roomCode)) {
            clearInterval(gameLoopIntervals.get(roomCode));
            gameLoopIntervals.delete(roomCode);
        }
        addChatMessage(roomCode, 'Narrator', `Permainan berakhir! ${winner.charAt(0).toUpperCase() + winner.slice(1)} menang!`, 'system');
        broadcastToRoom(roomCode, 'room-update', room);
        return true;
    }
    return false;
}

// Fungsi Utilitas
function createGameRoom(hostPlayer) {
  const roomCode = generateRoomCode();
  const room = {
    code: roomCode,
    host: hostPlayer.id,
    players: [hostPlayer],
    gameState: { phase: 'lobby', dayCount: 1, timeRemaining: 0, nightActions: {} },
    chatMessages: [{ id: uuidv4(), player: 'Narrator', message: `Welcome to room ${roomCode}! Share with friends.`, type: 'system', timestamp: Date.now() }],
    settings: {
      werewolves: 2, villagers: 4, seer: 1, doctor: 1,
      dayDuration: 20, 
      nightDuration: 20  
    },
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  gameRooms.set(roomCode, room);
  return room;
}

function addChatMessage(roomCode, playerName, message, type = 'player') {
  const room = gameRooms.get(roomCode);
  if (!room) return;
  const newMessage = { id: uuidv4(), player: playerName, message, type, timestamp: Date.now() };
  room.chatMessages.push(newMessage);
  room.lastActivity = Date.now();
  broadcastToRoom(roomCode, 'room-update', room); // Kirim update ruangan lengkap
}

function broadcastToRoom(roomCode, event, data) {
    io.to(roomCode).emit(event, data);
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return gameRooms.has(result) ? generateRoomCode() : result;
}

// Event Handler Socket.IO
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('create-room', (playerData, callback) => {
    try {
        const player = { id: uuidv4(), name: playerData.name, role: 'villager', isAlive: true, isHost: true, isReady: false, votes: 0 };
        const room = createGameRoom(player);
        socket.join(room.code);
        playerSockets.set(player.id, socket.id);
        callback({ success: true, roomCode: room.code, player: player, room: room });
    } catch (error) {
        callback({ success: false, error: 'Failed to create room' });
    }
  });

  socket.on('join-room', (data, callback) => {
    try {
        const { roomCode, playerName } = data;
        const room = gameRooms.get(roomCode);
        if (!room) return callback({ success: false, error: 'Room not found' });
        if (room.players.length >= 12) return callback({ success: false, error: 'Room is full' });
        if (room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) return callback({ success: false, error: 'Name already taken' });
        if (room.gameState.phase !== 'lobby') return callback({ success: false, error: 'Game already started' });
        
        const player = { id: uuidv4(), name: playerName, role: 'villager', isAlive: true, isHost: false, isReady: false, votes: 0 };
        room.players.push(player);
        socket.join(roomCode);
        playerSockets.set(player.id, socket.id);
        addChatMessage(roomCode, 'System', `${playerName} joined the game!`, 'system');
        callback({ success: true, player: player, room: room });
    } catch (error) {
        callback({ success: false, error: 'Failed to join room' });
    }
  });

  socket.on('toggle-ready', (data) => {
    const { roomCode, playerId } = data;
    const room = gameRooms.get(roomCode);
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.isReady = !player.isReady;
        broadcastToRoom(roomCode, 'room-update', room);
      }
    }
  });

  socket.on('start-game', (data) => {
    const { roomCode, settings } = data;
    const room = gameRooms.get(roomCode);
    if (!room) return;

    const roles = [];
    for (let i = 0; i < settings.werewolves; i++) roles.push('werewolf');
    for (let i = 0; i < settings.seer; i++) roles.push('seer');
    for (let i = 0; i < settings.doctor; i++) roles.push('doctor');
    for (let i = 0; i < settings.villagers; i++) roles.push('villager');
    
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    
    room.players.forEach((player, index) => {
      player.role = roles[index] || 'villager';
    });

    room.settings = settings; // Terapkan settings dari host
    room.gameState.phase = 'day';
    room.gameState.timeRemaining = room.settings.dayDuration;
    
    addChatMessage(roomCode, 'Narrator', 'Peran telah dibagikan! Permainan dimulai.', 'system');
    startGameLoop(roomCode);
  });
  
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

  socket.on('vote-player', (data) => {
    const { roomCode, voterId, targetId } = data;
    const room = gameRooms.get(roomCode);
    if (room && room.gameState.phase === 'voting') {
      const voter = room.players.find(p => p.id === voterId);
      if (voter && voter.isAlive) {
        voter.votedFor = voter.votedFor === targetId ? undefined : targetId;
        broadcastToRoom(roomCode, 'room-update', room);
      }
    }
  });

  socket.on('use-ability', (data) => {
    const { roomCode, playerId, targetId, ability } = data;
    const room = gameRooms.get(roomCode);
    if (room && room.gameState.phase === 'night') {
      const player = room.players.find(p => p.id === playerId);
      if (player && player.isAlive && !player.hasUsedAbility) {
        player.hasUsedAbility = true;
        room.gameState.nightActions[ability] = targetId;
        if (ability === 'seer') {
          const target = room.players.find(p => p.id === targetId);
          if (target) {
            socket.emit('seer-result', { targetName: target.name, targetRole: target.role });
          }
        }
      }
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const [playerId, socketId] of playerSockets) {
      if (socketId === socket.id) {
        playerSockets.delete(playerId);
        for (const [roomCode, room] of gameRooms) {
          const playerIndex = room.players.findIndex(p => p.id === playerId);
          if (playerIndex !== -1) {
            const player = room.players[playerIndex];
            room.players.splice(playerIndex, 1);
            if (room.players.length === 0) {
                gameRooms.delete(roomCode);
                if (gameLoopIntervals.has(roomCode)) {
                    clearInterval(gameLoopIntervals.get(roomCode));
                    gameLoopIntervals.delete(roomCode);
                }
            } else {
                if (room.host === playerId) {
                    room.host = room.players[0].id;
                    room.players[0].isHost = true;
                    addChatMessage(roomCode, 'System', `${player.name} disconnected. ${room.players[0].name} is now the host.`, 'system');
                } else {
                    addChatMessage(roomCode, 'System', `${player.name} disconnected.`, 'system');
                }
            }
            break;
          }
        }
        break;
      }
    }
  });
});

// Endpoint dan Server
app.get('/health', (req, res) => res.json({ status: 'OK' }));
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));