import { io, Socket } from "socket.io-client";
import { Player, GameRoom, ChatMessage, GameSettings } from "../types/game";

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(serverUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url =
        serverUrl ||
        (process.env.NODE_ENV === "production"
          ? "https://webwarewolf-production.up.railway.app/"
          : "http://localhost:3001");

      this.socket = io(url, {
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
      });

      this.socket.on("connect", () => {
        console.log("✅ Connected to server");
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        console.error("❌ Connection failed:", error);
        reject(error);
      });

      this.socket.on("disconnect", (reason) => {
        console.log("🔌 Disconnected:", reason);
        this.emit("disconnected", reason);
      });

      // Listen for server events
      this.socket.on("room-update", (room: GameRoom) => {
        this.emit("room-update", room);
      });

      this.socket.on("chat-message", (message: ChatMessage) => {
        this.emit("chat-message", message);
      });

      this.socket.on(
        "seer-result",
        (data: { targetName: string; targetRole: string }) => {
          this.emit("seer-result", data);
        }
      );
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Room management
  createRoom(playerName: string): Promise<{
    success: boolean;
    roomCode?: string;
    player?: Player;
    room?: GameRoom;
    error?: string;
  }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" });
        return;
      }

      this.socket.emit("create-room", { name: playerName }, (response: any) => {
        resolve(response);
      });
    });
  }

  joinRoom(
    roomCode: string,
    playerName: string
  ): Promise<{
    success: boolean;
    player?: Player;
    room?: GameRoom;
    error?: string;
  }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, error: "Not connected to server" });
        return;
      }

      this.socket.emit(
        "join-room",
        { roomCode, playerName },
        (response: any) => {
          resolve(response);
        }
      );
    });
  }

  leaveRoom(roomCode: string, playerId: string): void {
    if (this.socket) {
      this.socket.emit("leave-room", { roomCode, playerId });
    }
  }

  // Game actions
  toggleReady(roomCode: string, playerId: string): void {
    if (this.socket) {
      this.socket.emit("toggle-ready", { roomCode, playerId });
    }
  }

  startGame(roomCode: string, settings: GameSettings): void {
    if (this.socket) {
      this.socket.emit("start-game", { roomCode, settings });
    }
  }

  sendMessage(
    roomCode: string,
    playerId: string,
    message: string,
    type: string = "player"
  ): void {
    if (this.socket) {
      this.socket.emit("send-message", { roomCode, playerId, message, type });
    }
  }

  votePlayer(roomCode: string, voterId: string, targetId: string): void {
    if (this.socket) {
      this.socket.emit("vote-player", { roomCode, voterId, targetId });
    }
  }

  useAbility(
    roomCode: string,
    playerId: string,
    targetId: string,
    ability: string
  ): void {
    if (this.socket) {
      this.socket.emit("use-ability", {
        roomCode,
        playerId,
        targetId,
        ability,
      });
    }
  }

  // Event handling
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionId(): string | undefined {
    return this.socket?.id;
  }
}

export default SocketService;