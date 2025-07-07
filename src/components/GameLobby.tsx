import React, { useState, useEffect } from 'react';
import { Users, Settings, Play, Copy, Crown, Check, X } from 'lucide-react';
import { Player, GameSettings } from '../types/game';

// 1. Perbaiki tipe properti onToggleReady
interface GameLobbyProps {
  players: Player[];
  currentPlayer: Player | null;
  roomCode: string;
  onStartGame: (settings: GameSettings) => void;
  onToggleReady: () => void; // Tidak lagi memerlukan playerId
  onRemovePlayer: (playerId: string) => void;
}

export default function GameLobby({ 
  players, 
  currentPlayer, 
  roomCode,
  onStartGame, 
  onToggleReady,
  onRemovePlayer 
}: GameLobbyProps) {
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    werewolves: 2,
    villagers: 4,
    seer: 1,
    doctor: 1,
    dayDuration: 20,
    nightDuration: 20
  });

  const [copySuccess, setCopySuccess] = useState(false);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  const allPlayersReady = players.length >= 4 && players.every(p => p.isReady);
  const totalRoles = gameSettings.werewolves + gameSettings.villagers + gameSettings.seer + gameSettings.doctor;
  const isValidSettings = totalRoles === players.length && players.length >= 4;

  const handleStartGame = () => {
    if (allPlayersReady && isValidSettings && currentPlayer?.isHost) {
      onStartGame(gameSettings);
    }
  };

  // Auto-adjust settings when player count changes
  useEffect(() => {
    const playerCount = players.length;
    if (playerCount >= 4) {
      const werewolfCount = Math.max(1, Math.floor(playerCount / 3));
      const specialRoles = Math.min(2, playerCount - werewolfCount - 1);
      const villagerCount = playerCount - werewolfCount - specialRoles;
      
      setGameSettings(prev => ({
        ...prev,
        werewolves: werewolfCount,
        villagers: Math.max(1, villagerCount),
        seer: specialRoles >= 1 ? 1 : 0,
        doctor: specialRoles >= 2 ? 1 : 0
      }));
    }
  }, [players.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Game Lobby</h1>
          <div className="flex items-center justify-center gap-2 text-gray-300">
            <span>Room Code:</span>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="font-mono text-white text-lg">{roomCode}</span>
              <button
                onClick={copyRoomCode}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Copy room code"
              >
                {copySuccess ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {copySuccess && (
            <p className="text-green-400 text-sm mt-2">Room code copied to clipboard!</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Players List */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-semibold text-white">Players ({players.length}/12)</h2>
                </div>
                {players.length < 4 && (
                  <span className="text-yellow-400 text-sm">Need at least 4 players</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {player.isHost && (
                          <Crown className="w-5 h-5 text-yellow-400" />
                        )}
                        <span className="text-white font-medium">{player.name}</span>
                        {player.id === currentPlayer?.id && (
                          <span className="text-blue-400 text-sm">(You)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm px-2 py-1 rounded-full flex items-center gap-1 ${
                          player.isReady 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {player.isReady ? (
                            <>
                              <Check className="w-3 h-3" />
                              Ready
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3" />
                              Not Ready
                            </>
                          )}
                        </span>
                        {/* 2. Perbaiki cara memanggil onToggleReady */}
                        {player.id === currentPlayer?.id && (
                          <button
                            onClick={onToggleReady}
                            className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
                          >
                            Toggle
                          </button>
                        )}
                        {currentPlayer?.isHost && !player.isHost && (
                          <button
                            onClick={() => onRemovePlayer(player.id)}
                            className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Game Settings */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-6 h-6 text-white" />
                <h2 className="text-xl font-semibold text-white">Game Settings</h2>
              </div>
              
              {currentPlayer?.isHost ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Werewolves</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={gameSettings.werewolves}
                      onChange={(e) => setGameSettings({...gameSettings, werewolves: parseInt(e.target.value) || 1})}
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Villagers</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={gameSettings.villagers}
                      onChange={(e) => setGameSettings({...gameSettings, villagers: parseInt(e.target.value) || 1})}
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Seer</label>
                    <select
                      value={gameSettings.seer}
                      onChange={(e) => setGameSettings({...gameSettings, seer: parseInt(e.target.value)})}
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Doctor</label>
                    <select
                      value={gameSettings.doctor}
                      onChange={(e) => setGameSettings({...gameSettings, doctor: parseInt(e.target.value)})}
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="text-sm text-gray-300">
                      <p>Total roles: {totalRoles}</p>
                      <p>Players: {players.length}</p>
                      {!isValidSettings && (
                        <p className="text-red-400 mt-1">⚠️ Roles must match player count</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-gray-300">
                  <div className="flex justify-between">
                    <span>Werewolves:</span>
                    <span className="text-white">{gameSettings.werewolves}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Villagers:</span>
                    <span className="text-white">{gameSettings.villagers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Seer:</span>
                    <span className="text-white">{gameSettings.seer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Doctor:</span>
                    <span className="text-white">{gameSettings.doctor}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-4">
                    Only the host can modify game settings
                  </p>
                </div>
              )}
            </div>

            {currentPlayer?.isHost && (
              <button
                onClick={handleStartGame}
                disabled={!allPlayersReady || !isValidSettings}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-lg transition-all ${
                  allPlayersReady && isValidSettings
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg transform hover:scale-105'
                    : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Play className="w-6 h-6" />
                Start Game
              </button>
            )}

            {!currentPlayer?.isHost && (
              <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-gray-300">Waiting for host to start the game...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}