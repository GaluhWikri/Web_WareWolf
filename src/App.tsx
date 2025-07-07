// src/App.tsx

import React, { useState, useEffect } from "react"; // 1. Import useEffect
import HomePage from "./components/HomePage";
import JoinGame from "./components/JoinGame";
import GameLobby from "./components/GameLobby";
import GameRoom from "./components/GameRoom";
import { useGameState } from "./hooks/useGameState";
import { GameSettings } from "./types/game";

type AppState = "home" | "join" | "lobby" | "game";

function App() {
  const [appState, setAppState] = useState<AppState>("home");
  const [joinError, setJoinError] = useState<string>("");

  const {
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
  } = useGameState();

  // 2. Tambahkan useEffect untuk mengawasi perubahan fase permainan
  useEffect(() => {
    // Jika fase permainan bukan lagi 'lobby' dan kita sedang dalam lobi, pindah ke permainan
    if (gameState.phase !== 'lobby' && appState === 'lobby') {
      setAppState('game');
    }
    // Jika fase permainan kembali ke 'lobby' (misalnya setelah game berakhir), kembali ke lobi
    if (gameState.phase === 'lobby' && appState === 'game') {
        // Ini opsional, tergantung alur permainan yang Anda inginkan setelah selesai
        setAppState('lobby');
    }
  }, [gameState.phase, appState]);


  const handleCreateGame = async (playerName: string = "Host") => {
    const { success, error } = await createRoom(playerName);
    if (success) {
      setAppState("lobby");
    } else {
      console.error("Failed to create room:", error);
    }
  };

  const handleJoinGame = async (playerName: string, roomCode: string) => {
    setJoinError("");
    const { success, error } = await joinRoom(roomCode, playerName);

    if (success) {
      setAppState("lobby");
    } else {
      setJoinError(
        error || "Failed to join room. Please check the code and player name."
      );
    }
  };

  // 3. Hapus perubahan state lokal dari handleStartGame
  const handleStartGame = (settings: GameSettings) => {
    startGame(settings);
    // setAppState("game"); // HAPUS BARIS INI
  };

  const handleVote = (targetId: string) => {
    voteForPlayer(targetId);
  };

  const handleUseAbility = (targetId: string) => {
    useNightAbility(targetId);
  };

  const handleSendMessage = (message: string) => {
    addChatMessage(message);
  };

  const handleEndGame = () => {
    leaveRoom();
    setAppState("home");
  };

  const handleBack = () => {
    setAppState("home");
    setJoinError("");
  };

  const handleToggleReady = () => {
    if (currentPlayer) {
        // Memastikan onToggleReady di GameLobby tidak memerlukan argumen
        togglePlayerReady();
    }
  };
  
  // Mengubah handleToggleReady di App.tsx agar sesuai dengan pemanggilan dari GameLobby
  const handlePlayerToggleReady = () => {
    if (currentPlayer) {
      togglePlayerReady();
    }
  };

  const handleRemovePlayer = (playerId: string) => {
    console.warn(
      `Fungsi remove-player untuk ${playerId} belum diimplementasikan di backend.`
    );
  };

  const renderContent = () => {
    switch (appState) {
      case "home":
        return (
          <HomePage
            onCreateGame={() => handleCreateGame()}
            onJoinGame={() => setAppState("join")}
          />
        );
      case "join":
        return (
          <JoinGame
            onBack={handleBack}
            onJoin={handleJoinGame}
            error={joinError}
          />
        );
      case "lobby":
        if (!currentRoomCode) return <div>Loading...</div>;
        return (
          <GameLobby
            players={players}
            currentPlayer={currentPlayer}
            roomCode={currentRoomCode}
            onStartGame={handleStartGame}
            // Menggunakan fungsi yang telah disesuaikan
            onToggleReady={handlePlayerToggleReady}
            onRemovePlayer={handleRemovePlayer}
          />
        );
      case "game":
        return (
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
        );
      default:
        return (
          <HomePage
            onCreateGame={() => handleCreateGame()}
            onJoinGame={() => setAppState("join")}
          />
        );
    }
  };

  return <div className="min-h-screen">{renderContent()}</div>;
}

export default App;