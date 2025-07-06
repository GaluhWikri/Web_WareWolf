import { useState, useCallback, useEffect } from 'react';
import { Player, GameState, ChatMessage, GameSettings, GameRoom } from '../types/game';
import SocketService from '../services/socketService';

export function useGameState() {
  const [currentRoomCode, setCurrentRoomCode] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    phase: 'lobby',
    dayCount: 1,
    timeRemaining: 300,
    nightActions: {}
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [socketService] = useState(() => SocketService.getInstance());

  // Menghubungkan ke server dan mengatur listener
  useEffect(() => {
    if (!socketService.isConnected()) {
      socketService.connect().catch(err => {
        console.error("Connection failed on mount:", err);
      });
    }

    const handleRoomUpdate = (room: GameRoom) => {
      if (room && room.code === currentRoomCode) {
        setPlayers([...room.players]);
        setGameState({ ...room.gameState });
        setChatMessages([...room.chatMessages]);

        // Update data currentPlayer jika ada perubahan
        if (currentPlayer) {
          const updatedSelf = room.players.find(p => p.id === currentPlayer.id);
          if (updatedSelf) {
            setCurrentPlayer(updatedSelf);
          }
        }
      }
    };
    
    const handleChatMessage = (message: ChatMessage) => {
        setChatMessages(prev => [...prev, message]);
    };
    
    const handleSeerResult = (data: { targetName: string, targetRole: string }) => {
        addChatMessage('Narrator', `Anda menginvestigasi ${data.targetName}. Mereka adalah seorang ${data.targetRole}.`, 'system');
    };

    socketService.on('room-update', handleRoomUpdate);
    socketService.on('chat-message', handleChatMessage);
    socketService.on('seer-result', handleSeerResult);

    return () => {
      socketService.off('room-update', handleRoomUpdate);
      socketService.off('chat-message', handleChatMessage);
      socketService.off('seer-result', handleSeerResult);
      // Jangan disconnect di sini agar koneksi tetap terjaga saat navigasi
    };
  }, [socketService, currentRoomCode, currentPlayer]);
  
  // Fungsi untuk membuat room baru
  const createRoom = useCallback(async (playerName: string) => {
    const response = await socketService.createRoom(playerName);
    if (response.success && response.roomCode && response.player && response.room) {
      setCurrentRoomCode(response.roomCode);
      setCurrentPlayer(response.player);
      setPlayers(response.room.players);
      setGameState(response.room.gameState);
      setChatMessages(response.room.chatMessages);
      return { success: true, roomCode: response.roomCode };
    }
    return { success: false, error: response.error };
  }, [socketService]);

  // Fungsi untuk bergabung ke room
  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    const response = await socketService.joinRoom(roomCode, playerName);
    if (response.success && response.player && response.room) {
      setCurrentRoomCode(roomCode);
      setCurrentPlayer(response.player);
      setPlayers(response.room.players);
      setGameState(response.room.gameState);
      setChatMessages(response.room.chatMessages);
      return { success: true };
    }
    return { success: false, error: response.error };
  }, [socketService]);

  // Fungsi untuk meninggalkan room
  const leaveRoom = useCallback(() => {
    if (currentRoomCode && currentPlayer) {
      socketService.leaveRoom(currentRoomCode, currentPlayer.id);
      setCurrentRoomCode('');
      setPlayers([]);
      setCurrentPlayer(null);
    }
  }, [socketService, currentRoomCode, currentPlayer]);

  // Fungsi untuk mengubah status ready
  const togglePlayerReady = useCallback(() => {
    if (currentRoomCode && currentPlayer) {
      socketService.toggleReady(currentRoomCode, currentPlayer.id);
    }
  }, [socketService, currentRoomCode, currentPlayer]);

  // Fungsi untuk memulai game
  const startGame = useCallback((settings: GameSettings) => {
    if (currentRoomCode) {
      socketService.startGame(currentRoomCode, settings);
    }
  }, [socketService, currentRoomCode]);

  // Fungsi untuk mengirim pesan chat
  const addChatMessage = useCallback((message: string) => {
    if (currentRoomCode && currentPlayer) {
        const messageType = gameState.phase === 'night' && currentPlayer.role === 'werewolf' 
        ? 'werewolf' 
        : 'player';
      socketService.sendMessage(currentRoomCode, currentPlayer.id, message, messageType);
    }
  }, [socketService, currentRoomCode, currentPlayer, gameState.phase]);

  // Fungsi untuk vote pemain
  const voteForPlayer = useCallback((targetId: string) => {
    if (currentRoomCode && currentPlayer) {
      socketService.votePlayer(currentRoomCode, currentPlayer.id, targetId);
    }
  }, [socketService, currentRoomCode, currentPlayer]);

  // Fungsi untuk menggunakan kemampuan di malam hari
  const useNightAbility = useCallback((targetId: string) => {
    if (currentRoomCode && currentPlayer && currentPlayer.role !== 'villager') {
      socketService.useAbility(currentRoomCode, currentPlayer.id, targetId, currentPlayer.role);
    }
  }, [socketService, currentRoomCode, currentPlayer]);

  return {
    players,
    currentPlayer,
    gameState,
    chatMessages,
    currentRoomCode,
    createRoom,
    joinRoom,
    leaveRoom,
    togglePlayerReady,
    startGame,
    addChatMessage,
    voteForPlayer,
    useNightAbility,
    setCurrentPlayer, // mungkin masih dibutuhkan di App.tsx
  };
}