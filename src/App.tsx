import React, { useState } from 'react';
import HomePage from './components/HomePage';
import JoinGame from './components/JoinGame';
import GameLobby from './components/GameLobby';
import GameRoom from './components/GameRoom';
import { useGameState } from './hooks/useGameState';
import { GameSettings } from './types/game';

type AppState = 'home' | 'join' | 'lobby' | 'game';

function App() {
  const [view, setView] = useState<AppState>('home');
  const {
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
    leaveRoom
  } = useGameState();

  const handleCreateGame = async (playerName: string) => {
    await createRoom(playerName);
    setView('lobby');
  };

  const handleJoinGame = async (playerName: string, roomCode: string) => {
    await joinRoom(roomCode, playerName);
    if (!error) {
        setView('lobby');
    }
  };
  
  // Update view berdasarkan state dari hook
  React.useEffect(() => {
    if (room && room.gameState.phase !== 'lobby' && view !== 'game') {
        setView('game');
    } else if (room && room.gameState.phase === 'lobby' && view !== 'lobby') {
        setView('lobby');
    } else if (!room && view !== 'home' && view !== 'join') {
        setView('home');
    }
  }, [room, view]);

  const renderContent = () => {
    switch (view) {
      case 'join':
        return <JoinGame onBack={() => setView('home')} onJoin={handleJoinGame} error={error} />;
      
      case 'lobby':
        return room && currentPlayer ? (
          <GameLobby 
            players={room.players}
            currentPlayer={currentPlayer}
            roomCode={room.code}
            onStartGame={startGame}
            onToggleReady={() => toggleReady()}
            onRemovePlayer={() => { /* Implement if needed via socket */ }}
          />
        ) : <div>Loading lobby...</div>;

      case 'game':
        return room && currentPlayer ? (
            <GameRoom
                players={room.players}
                currentPlayer={currentPlayer}
                gameState={room.gameState}
                chatMessages={room.chatMessages}
                onVote={votePlayer}
                onUseAbility={useAbility}
                onSendMessage={sendMessage}
                onEndGame={() => { leaveRoom(); setView('home'); }}
            />
        ) : <div>Loading game...</div>;
        
      default: // home
        return (
          <HomePage 
            // Modifikasi HomePage untuk menerima nama, atau buat state baru di sini
            onCreateGame={() => {
                const name = prompt("Masukkan nama Anda:");
                if(name) handleCreateGame(name);
            }}
            onJoinGame={() => setView('join')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen">
      {renderContent()}
    </div>
  );
}

export default App;