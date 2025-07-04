// Game service to handle multiplayer functionality
// This simulates a backend service using localStorage and polling

export interface GameRoom {
  code: string;
  host: string;
  players: Player[];
  gameState: GameState;
  chatMessages: ChatMessage[];
  settings: GameSettings;
  createdAt: number;
  lastActivity: number;
}

import { Player, GameState, ChatMessage, GameSettings } from '../types/game';

class GameService {
  private static instance: GameService;
  private pollInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(rooms: Map<string, GameRoom>) => void> = [];

  static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  private constructor() {
    this.startPolling();
    this.cleanupOldRooms();
  }

  // Generate unique room code
  generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure uniqueness
    if (this.getRooms().has(result)) {
      return this.generateRoomCode();
    }
    
    return result;
  }

  // Get all rooms from localStorage
  getRooms(): Map<string, GameRoom> {
    try {
      const stored = localStorage.getItem('werewolf_rooms');
      if (stored) {
        const data = JSON.parse(stored);
        return new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
    return new Map();
  }

  // Save rooms to localStorage
  private saveRooms(rooms: Map<string, GameRoom>): void {
    try {
      const data = Object.fromEntries(rooms);
      localStorage.setItem('werewolf_rooms', JSON.stringify(data));
      this.notifyListeners(rooms);
    } catch (error) {
      console.error('Error saving rooms:', error);
    }
  }

  // Create new room
  createRoom(hostPlayer: Player): string {
    const roomCode = this.generateRoomCode();
    const rooms = this.getRooms();
    
    const newRoom: GameRoom = {
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
          id: Date.now().toString(),
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
    
    rooms.set(roomCode, newRoom);
    this.saveRooms(rooms);
    return roomCode;
  }

  // Join existing room
  joinRoom(roomCode: string, player: Player): { success: boolean; error?: string } {
    const rooms = this.getRooms();
    const room = rooms.get(roomCode);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players.length >= 12) {
      return { success: false, error: 'Room is full' };
    }

    if (room.players.some(p => p.name.toLowerCase() === player.name.toLowerCase())) {
      return { success: false, error: 'Name already taken' };
    }

    if (room.gameState.phase !== 'lobby') {
      return { success: false, error: 'Game already started' };
    }

    // Add player to room
    room.players.push(player);
    room.chatMessages.push({
      id: Date.now().toString(),
      player: 'System',
      message: `${player.name} joined the game!`,
      type: 'system',
      timestamp: Date.now()
    });
    room.lastActivity = Date.now();

    rooms.set(roomCode, room);
    this.saveRooms(rooms);
    return { success: true };
  }

  // Get specific room
  getRoom(roomCode: string): GameRoom | null {
    const rooms = this.getRooms();
    return rooms.get(roomCode) || null;
  }

  // Update room
  updateRoom(roomCode: string, updates: Partial<GameRoom>): boolean {
    const rooms = this.getRooms();
    const room = rooms.get(roomCode);
    
    if (!room) {
      return false;
    }

    const updatedRoom = { 
      ...room, 
      ...updates, 
      lastActivity: Date.now() 
    };
    
    rooms.set(roomCode, updatedRoom);
    this.saveRooms(rooms);
    return true;
  }

  // Remove player from room
  removePlayerFromRoom(roomCode: string, playerId: string): boolean {
    const rooms = this.getRooms();
    const room = rooms.get(roomCode);
    
    if (!room) {
      return false;
    }

    room.players = room.players.filter(p => p.id !== playerId);
    room.lastActivity = Date.now();

    // If host leaves, transfer host to another player or delete room
    if (room.host === playerId) {
      if (room.players.length > 0) {
        room.host = room.players[0].id;
        room.players[0].isHost = true;
        room.chatMessages.push({
          id: Date.now().toString(),
          player: 'System',
          message: `${room.players[0].name} is now the host.`,
          type: 'system',
          timestamp: Date.now()
        });
      } else {
        // Delete empty room
        rooms.delete(roomCode);
        this.saveRooms(rooms);
        return true;
      }
    }

    rooms.set(roomCode, room);
    this.saveRooms(rooms);
    return true;
  }

  // Add listener for room updates
  addListener(callback: (rooms: Map<string, GameRoom>) => void): void {
    this.listeners.push(callback);
  }

  // Remove listener
  removeListener(callback: (rooms: Map<string, GameRoom>) => void): void {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  // Notify all listeners
  private notifyListeners(rooms: Map<string, GameRoom>): void {
    this.listeners.forEach(callback => callback(rooms));
  }

  // Start polling for changes (simulates real-time updates)
  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      const rooms = this.getRooms();
      this.notifyListeners(rooms);
    }, 2000); // Poll every 2 seconds
  }

  // Stop polling
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Clean up old rooms (older than 2 hours)
  private cleanupOldRooms(): void {
    const rooms = this.getRooms();
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours
    
    let hasChanges = false;
    for (const [code, room] of rooms) {
      if (now - room.lastActivity > maxAge) {
        rooms.delete(code);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      this.saveRooms(rooms);
    }
  }
}

export default GameService;