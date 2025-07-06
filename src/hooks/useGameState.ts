import { useState, useCallback, useEffect } from 'react';
import { Player, GameState, ChatMessage, GameSettings } from '../types/game';
import GameService from '../services/gameService';


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
  const [gameService] = useState(() => GameService.getInstance());

  // Listen for room updates
  useEffect(() => {
    const handleRoomUpdate = (rooms: Map<string, any>) => {
      if (currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          setPlayers([...room.players]);
          setGameState({ ...room.gameState });
          setChatMessages([...room.chatMessages]);
        }
      }
    };

    gameService.addListener(handleRoomUpdate);
    return () => gameService.removeListener(handleRoomUpdate);
  }, [currentRoomCode, gameService]);

  // Timer for phase transitions
  useEffect(() => {
    if (gameState.timeRemaining > 0 && gameState.phase !== 'lobby') {
      const timer = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
        
        // Update room with new time
        if (currentRoomCode) {
          gameService.updateRoom(currentRoomCode, { gameState: { ...gameState, timeRemaining: gameState.timeRemaining - 1 } });
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState.timeRemaining === 0 && gameState.phase !== 'lobby') {
      // Auto transition when time runs out
      if (gameState.phase === 'day') {
        transitionToVoting();
      } else if (gameState.phase === 'voting') {
        processVotes();
      } else if (gameState.phase === 'night') {
        processNightActions();
      }
    }
  }, [gameState.timeRemaining, gameState.phase, currentRoomCode]);

  const addPlayer = useCallback((name: string, isHost: boolean = false) => {
    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
      role: 'villager',
      isAlive: true,
      isHost,
      isReady: false,
      votes: 0
    };
    
    if (isHost) {
      // Create new room for host
      const roomCode = gameService.createRoom(newPlayer);
      setCurrentRoomCode(roomCode);
      setCurrentPlayer(newPlayer);
      
      // Load room data
      const room = gameService.getRoom(roomCode);
      if (room) {
        setPlayers([...room.players]);
        setGameState({ ...room.gameState });
        setChatMessages([...room.chatMessages]);
      }
      
      return { player: newPlayer, roomCode };
    } else {
      return { player: newPlayer, roomCode: currentRoomCode };
    }
  }, [gameService, currentRoomCode]);

  const joinRoom = useCallback((roomCode: string, player: Player): boolean => {
    const result = gameService.joinRoom(roomCode, player);
    
    if (result.success) {
      setCurrentRoomCode(roomCode);
      
      // Load room data
      const room = gameService.getRoom(roomCode);
      if (room) {
        setPlayers([...room.players]);
        setGameState({ ...room.gameState });
        setChatMessages([...room.chatMessages]);
      }
      
      return true;
    }
    
    return false;
  }, [gameService]);

  const removePlayer = useCallback((playerId: string) => {
    if (currentRoomCode) {
      gameService.removePlayerFromRoom(currentRoomCode, playerId);
    }
  }, [currentRoomCode, gameService]);

  const togglePlayerReady = useCallback((playerId: string) => {
    const updatedPlayers = players.map(p => 
      p.id === playerId ? { ...p, isReady: !p.isReady } : p
    );
    
    if (currentRoomCode) {
      gameService.updateRoom(currentRoomCode, { players: updatedPlayers });
    }
  }, [players, currentRoomCode, gameService]);

  const assignRoles = useCallback((settings: GameSettings) => {
    const roles: Array<Player['role']> = [];
    
    // Add roles based on settings
    for (let i = 0; i < settings.werewolves; i++) roles.push('werewolf');
    for (let i = 0; i < settings.seer; i++) roles.push('seer');
    for (let i = 0; i < settings.doctor; i++) roles.push('doctor');
    for (let i = 0; i < settings.villagers; i++) roles.push('villager');
    
    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    
    const updatedPlayers = players.map((player, index) => ({
      ...player,
      role: roles[index] || 'villager',
      votes: 0,
      hasUsedAbility: false
    }));

    const newGameState = {
      ...gameState,
      phase: 'day' as const,
      timeRemaining: settings.dayDuration
    };

    if (currentRoomCode) {
      gameService.updateRoom(currentRoomCode, { 
        players: updatedPlayers,
        gameState: newGameState,
        settings
      });
    }

    addChatMessage('Narrator', 'Roles have been assigned! The game begins now.', 'system');
  }, [players, gameState, currentRoomCode, gameService]);

  const voteForPlayer = useCallback((voterId: string, targetId: string) => {
    const updatedPlayers = players.map(p => {
      if (p.id === voterId) {
        return { ...p, votedFor: p.votedFor === targetId ? undefined : targetId };
      }
      return p;
    });

    if (currentRoomCode) {
      gameService.updateRoom(currentRoomCode, { players: updatedPlayers });
    }
  }, [players, currentRoomCode, gameService]);

  const addChatMessage = useCallback((player: string, message: string, type: ChatMessage['type'] = 'player') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      player,
      message,
      type,
      timestamp: Date.now()
    };
    
    const updatedMessages = [...chatMessages, newMessage];
    
    if (currentRoomCode) {
      gameService.updateRoom(currentRoomCode, { chatMessages: updatedMessages });
    }
  }, [chatMessages, currentRoomCode, gameService]);

  const transitionToVoting = useCallback(() => {
    const newGameState = {
      ...gameState,
      phase: 'voting' as const,
      timeRemaining: 60
    };
    
    if (currentRoomCode) {
      gameService.updateRoom(currentRoomCode, { gameState: newGameState });
    }
    
    addChatMessage('Narrator', 'Voting phase begins! Cast your votes now.', 'system');
  }, [gameState, currentRoomCode, gameService]);

  const transitionToNight = useCallback(() => {
    const newGameState = {
      ...gameState,
      phase: 'night' as const,
      timeRemaining: 120,
      nightActions: {}
    };
    
    const updatedPlayers = players.map(p => ({ ...p, hasUsedAbility: false }));
    
    if (currentRoomCode) {
      gameService.updateRoom(currentRoomCode, { 
        gameState: newGameState,
        players: updatedPlayers
      });
    }
    
    addChatMessage('Narrator', 'Night falls... Special roles, use your abilities now.', 'system');
  }, [gameState, players, currentRoomCode, gameService]);

  const transitionToDay = useCallback(() => {
    const newGameState = {
      ...gameState,
      phase: 'day' as const,
      dayCount: gameState.dayCount + 1,
      timeRemaining: 300
    };
    
    if (currentRoomCode) {
      gameService.updateRoom(currentRoomCode, { gameState: newGameState });
    }
    
    addChatMessage('Narrator', `Day ${gameState.dayCount + 1} begins. Discuss and find the werewolves!`, 'system');
  }, [gameState, currentRoomCode, gameService]);

  const processVotes = useCallback(() => {
    // Count votes
    const voteCounts: Record<string, number> = {};
    players.forEach(player => {
      if (player.votedFor && player.isAlive) {
        voteCounts[player.votedFor] = (voteCounts[player.votedFor] || 0) + 1;
      }
    });

    // Find player with most votes
    let maxVotes = 0;
    let eliminatedPlayerId = '';
    Object.entries(voteCounts).forEach(([playerId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        eliminatedPlayerId = playerId;
      }
    });

    let updatedPlayers = players;
    if (eliminatedPlayerId && maxVotes > 0) {
      const eliminatedPlayer = players.find(p => p.id === eliminatedPlayerId);
      updatedPlayers = players.map(p => 
        p.id === eliminatedPlayerId ? { ...p, isAlive: false } : { ...p, votedFor: undefined, votes: 0 }
      );
      
      if (eliminatedPlayer) {
        addChatMessage('Narrator', `${eliminatedPlayer.name} has been eliminated! They were a ${eliminatedPlayer.role}.`, 'system');
      }
    } else {
      addChatMessage('Narrator', 'No one was eliminated due to a tie vote.', 'system');
      updatedPlayers = players.map(p => ({ ...p, votedFor: undefined, votes: 0 }));
    }

    if (currentRoomCode) {
      gameService.updateRoom(currentRoomCode, { players: updatedPlayers });
    }

    // Check win conditions
    setTimeout(() => {
      checkWinConditions();
      if (!gameState.winner) {
        transitionToNight();
      }
    }, 3000);
  }, [players, gameState.winner, currentRoomCode, gameService]);

  const processNightActions = useCallback(() => {
    const { werewolfTarget, doctorTarget } = gameState.nightActions;
    
    let updatedPlayers = players;
    if (werewolfTarget && werewolfTarget !== doctorTarget) {
      const victim = players.find(p => p.id === werewolfTarget);
      if (victim) {
        updatedPlayers = players.map(p => 
          p.id === werewolfTarget ? { ...p, isAlive: false } : p
        );
        addChatMessage('Narrator', `${victim.name} was eliminated by the werewolves during the night!`, 'system');
      }
    } else if (werewolfTarget === doctorTarget) {
      addChatMessage('Narrator', 'The doctor saved someone from the werewolves!', 'system');
    } else {
      addChatMessage('Narrator', 'The night was peaceful. No one was eliminated.', 'system');
    }

    if (currentRoomCode) {
      gameService.updateRoom(currentRoomCode, { players: updatedPlayers });
    }

    // Check win conditions
    setTimeout(() => {
      checkWinConditions();
      if (!gameState.winner) {
        transitionToDay();
      }
    }, 3000);
  }, [gameState.nightActions, players, gameState.winner, currentRoomCode, gameService]);

  const useNightAbility = useCallback((playerId: string, targetId: string, ability: 'werewolf' | 'doctor' | 'seer') => {
    if (gameState.phase !== 'night') return;
    
    const player = players.find(p => p.id === playerId);
    if (!player || player.hasUsedAbility || !player.isAlive) return;

    const updatedPlayers = players.map(p => 
      p.id === playerId ? { ...p, hasUsedAbility: true } : p
    );

    const newGameState = {
      ...gameState,
      nightActions: {
        ...gameState.nightActions,
        [`${ability}Target`]: targetId
      }
    };

    if (currentRoomCode) {
      gameService.updateRoom(currentRoomCode, { 
        players: updatedPlayers,
        gameState: newGameState
      });
    }

    if (ability === 'seer') {
      const target = players.find(p => p.id === targetId);
      if (target && currentPlayer?.id === playerId) {
        addChatMessage('Narrator', `You investigated ${target.name}. They are a ${target.role}.`, 'system');
      }
    }
  }, [gameState, players, currentPlayer, currentRoomCode, gameService]);

  const checkWinConditions = useCallback(() => {
    const alivePlayers = players.filter(p => p.isAlive);
    const aliveWerewolves = alivePlayers.filter(p => p.role === 'werewolf');
    const aliveVillagers = alivePlayers.filter(p => p.role !== 'werewolf');

    let winner = null;
    if (aliveWerewolves.length === 0) {
      winner = 'villagers';
      addChatMessage('Narrator', 'Villagers win! All werewolves have been eliminated.', 'system');
    } else if (aliveWerewolves.length >= aliveVillagers.length) {
      winner = 'werewolves';
      addChatMessage('Narrator', 'Werewolves win! They now outnumber the villagers.', 'system');
    }

    if (winner && currentRoomCode) {
      const newGameState = { ...gameState, winner };
      gameService.updateRoom(currentRoomCode, { gameState: newGameState });
    }
  }, [players, gameState, currentRoomCode, gameService]);

  return {
    players,
    currentPlayer,
    gameState,
    chatMessages,
    currentRoomCode,
    addPlayer,
    removePlayer,
    togglePlayerReady,
    assignRoles,
    voteForPlayer,
    addChatMessage,
    useNightAbility,
    setCurrentPlayer,
    transitionToVoting,
    transitionToNight,
    transitionToDay,
    joinRoom
  };
}