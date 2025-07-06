import React, { useState } from "react";
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

  // Menggunakan hook useGameState yang sudah diperbarui
  const {
    players,
    currentPlayer,
    gameState,
    chatMessages,
    currentRoomCode,
    createRoom, // Menggantikan addPlayer untuk host
    joinRoom,
    leaveRoom,
    togglePlayerReady, // Sekarang tidak perlu argumen
    startGame, // Menggantikan assignRoles
    addChatMessage, // Sekarang hanya perlu 1 argumen
    voteForPlayer,
    useNightAbility,
  } = useGameState();

  const handleCreateGame = async (playerName: string = "Host") => {
    const { success, error } = await createRoom(playerName);
    if (success) {
      setAppState("lobby");
    } else {
      // Handle error jika pembuatan room gagal
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

  const handleStartGame = (settings: GameSettings) => {
    startGame(settings);
    setAppState("game");
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
    togglePlayerReady();
  };

  // CATATAN: Fungsi remove player oleh host belum diimplementasikan di server
  // Anda perlu menambahkan event 'remove-player' di server.js
  const handleRemovePlayer = (playerId: string) => {
    console.warn(
      `Fungsi remove-player untuk ${playerId} belum diimplementasikan di backend.`
    );
    // Logika untuk emit 'remove-player' ke server akan ditambahkan di sini
  };

  const renderContent = () => {
    switch (appState) {
      case "home":
        return (
          <HomePage
            onCreateGame={() => handleCreateGame()} // Nama host bisa dibuat dinamis jika perlu
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
        // Cek apakah currentRoomCode sudah ada sebelum merender GameLobby
        if (!currentRoomCode) return <div>Loading...</div>;
        return (
          <GameLobby
            players={players}
            currentPlayer={currentPlayer}
            roomCode={currentRoomCode}
            onStartGame={handleStartGame}
            onToggleReady={handleToggleReady} // Disesuaikan
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
