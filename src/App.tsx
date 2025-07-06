import React, { useState } from 'react';
import HomePage from './components/HomePage';
import JoinGame from './components/JoinGame';
import GameLobby from './components/GameLobby';
import GameRoom from './components/GameRoom';
import { useGameState } from './hooks/useGameState';
import { GameSettings } from './types/game';

type AppState = 'home' | 'join' | 'lobby' | 'game';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('home');
  const [joinError, setJoinError] = useState<string>('');
  const {
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
    joinRoom
  } = useGameState();

  const handleCreateGame = () => {
    // Create host player
    const result = addPlayer('Host', true);
    if (result && typeof result === 'object' && 'player' in result) {
      setCurrentPlayer(result.player);
      setCurrentState('lobby');
    }
  };

  const handleJoinGame = (playerName: string, roomCode: string) => {
    setJoinError('');
    
    // Create player object
    const newPlayer = {
      id: Date.now().toString(),
      name: playerName,
      role: 'villager' as const,
      isAlive: true,
      isHost: false,
      isReady: false,
      votes: 0
    };

    // Try to join the room
    const success = joinRoom(roomCode, newPlayer);
    
    if (success) {
      setCurrentPlayer(newPlayer);
      setCurrentState('lobby');
    } else {
      // Set specific error message
      setJoinError('Room not found, is full, name taken, or game already started');
    }
  };

  const handleStartGame = (settings: GameSettings) => {
    assignRoles(settings);
    setCurrentState('game');
  };

  const handleVote = (targetId: string) => {
    if (currentPlayer) {
      voteForPlayer(currentPlayer.id, targetId);
    }
  };

  const handleUseAbility = (targetId: string) => {
    if (currentPlayer && gameState.phase === 'night') {
      const abilityType = currentPlayer.role === 'werewolf' ? 'werewolf' :
                          currentPlayer.role === 'doctor' ? 'doctor' :
                          currentPlayer.role === 'seer' ? 'seer' : null;
      
      if (abilityType) {
        useNightAbility(currentPlayer.id, targetId, abilityType);
      }
    }
  };

  const handleSendMessage = (message: string) => {
    if (currentPlayer) {
      const messageType = gameState.phase === 'night' && currentPlayer.role === 'werewolf' 
        ? 'werewolf' 
        : 'player';
      addChatMessage(currentPlayer.name, message, messageType);
    }
  };

  const handleEndGame = () => {
    setCurrentState('home');
  };

  const handleBack = () => {
    setCurrentState('home');
    setJoinError('');
  };

  const handleToggleReady = (playerId: string) => {
    togglePlayerReady(playerId);
  };

  const handleRemovePlayer = (playerId: string) => {
    const playerToRemove = players.find(p => p.id === playerId);
    if (playerToRemove) {
      removePlayer(playerId);
      addChatMessage('System', `${playerToRemove.name} left the game.`, 'system');
    }
  };

  return (
    <div className="min-h-screen">
      {currentState === 'home' && (
        <HomePage 
          onCreateGame={handleCreateGame}
          onJoinGame={() => setCurrentState('join')}
        />
      )}
      
      {currentState === 'join' && (
        <JoinGame 
          onBack={handleBack}
          onJoin={handleJoinGame}
          error={joinError}
        />
      )}
      
      {currentState === 'lobby' && (
        <GameLobby 
          players={players}
          currentPlayer={currentPlayer}
          roomCode={currentRoomCode}
          onStartGame={handleStartGame}
          onToggleReady={handleToggleReady}
          onRemovePlayer={handleRemovePlayer}
        />
      )}
      
      {currentState === 'game' && (
        <GameRoom 
          players={players}
          currentPlayer={currentPlayer}
          gameState={gameState}
          chatMessages={chatMessages}
          onVote={handleVote}
          onUseAbility={handleUseAbility}
          onSendMessage={handleSendMessage}
          onEndGame={handleEndGame}
        />
      )}
    </div>
  );
}

export default App;