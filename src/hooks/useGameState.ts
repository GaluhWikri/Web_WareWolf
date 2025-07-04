import { useState, useCallback, useEffect } from 'react';
import { Player, GameRoom, ChatMessage, GameSettings } from '../types/game';
import SocketService from '../services/socketService';

export function useGameState() {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string>('');
  const [socketService] = useState(() => SocketService.getInstance());

  useEffect(() => {
    // Fungsi untuk menangani update dari server
    const handleRoomUpdate = (updatedRoom: GameRoom) => {
      setRoom(updatedRoom);
      // Juga update data pemain saat ini jika ada perubahan
      const me = updatedRoom.players.find(p => p.id === currentPlayer?.id);
      if (me) {
        setCurrentPlayer(me);
      }
    };
    
    const handleChatMessage = (message: ChatMessage) => {
        setRoom(prevRoom => prevRoom ? { ...prevRoom, chatMessages: [...prevRoom.chatMessages, message] } : null);
    };

    const handleSeerResult = (data: { targetName: string; targetRole: string }) => {
        alert(`Anda menginvestigasi ${data.targetName} dan mereka adalah seorang ${data.targetRole}.`);
    };

    // Mulai mendengarkan event dari server
    socketService.on('room-update', handleRoomUpdate);
    socketService.on('chat-message', handleChatMessage);
    socketService.on('seer-result', handleSeerResult);

    // Membersihkan listener saat komponen tidak lagi digunakan
    return () => {
      socketService.off('room-update', handleRoomUpdate);
      socketService.off('chat-message', handleChatMessage);
      socketService.off('seer-result', handleSeerResult);
    };
  }, [socketService, currentPlayer?.id]);

  // Fungsi untuk membuat room baru
  const createRoom = useCallback(async (playerName: string) => {
    await socketService.connect();
    const response = await socketService.createRoom(playerName);
    if (response.success && response.room && response.player) {
      setRoom(response.room);
      setCurrentPlayer(response.player);
      setError('');
    } else {
      setError(response.error || 'Gagal membuat room');
    }
  }, [socketService]);
  
  // Fungsi untuk bergabung ke room
  const joinRoom = useCallback(async (roomCode: string, playerName:string) => {
    await socketService.connect();
    const response = await socketService.joinRoom(roomCode, playerName);
    if (response.success && response.room && response.player) {
      setRoom(response.room);
      setCurrentPlayer(response.player);
      setError('');
    } else {
      setError(response.error || 'Gagal bergabung dengan room');
    }
  }, [socketService]);
  
  // Fungsi-fungsi lain untuk berinteraksi dengan server
  const toggleReady = useCallback(() => {
    if (room?.code && currentPlayer?.id) {
        socketService.toggleReady(room.code, currentPlayer.id);
    }
  }, [socketService, room, currentPlayer]);

  const startGame = useCallback((settings: GameSettings) => {
    if (room?.code) {
        socketService.startGame(room.code, settings);
    }
  }, [socketService, room]);

  const sendMessage = useCallback((message: string) => {
     if (room && currentPlayer) {
       const messageType = room.gameState.phase === 'night' && currentPlayer.role === 'werewolf' 
         ? 'werewolf' 
         : 'player';
       socketService.sendMessage(room.code, currentPlayer.id, message, messageType);
     }
  }, [socketService, room, currentPlayer]);
  
  const votePlayer = useCallback((targetId: string) => {
      if (room && currentPlayer) {
          socketService.votePlayer(room.code, currentPlayer.id, targetId);
      }
  }, [socketService, room, currentPlayer]);

  const useAbility = useCallback((targetId: string) => {
      if(room && currentPlayer && currentPlayer.role !== 'villager') {
          socketService.useAbility(room.code, currentPlayer.id, targetId, currentPlayer.role);
      }
  }, [socketService, room, currentPlayer]);
  
  const leaveRoom = useCallback(() => {
      if (room && currentPlayer) {
          socketService.leaveRoom(room.code, currentPlayer.id);
      }
      setRoom(null);
      setCurrentPlayer(null);
  }, [socketService, room, currentPlayer]);

  return {
    room,
    currentPlayer,
    error,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    sendMessage,
    votePlayer,
    useAbility,
    leaveRoom,
  };
}