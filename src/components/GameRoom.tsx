import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Vote, MessageSquare, Users, Shield, Eye, Clock, Trophy } from 'lucide-react';
import { Player, GameState, ChatMessage } from '../types/game';

interface GameRoomProps {
  players: Player[];
  currentPlayer: Player | null;
  gameState: GameState;
  chatMessages: ChatMessage[];
  onVote: (targetId: string) => void;
  onUseAbility: (targetId: string) => void;
  onSendMessage: (message: string) => void;
  onEndGame: () => void;
}

export default function GameRoom({ 
  players, 
  currentPlayer, 
  gameState, 
  chatMessages, 
  onVote, 
  onUseAbility, 
  onSendMessage,
  onEndGame 
}: GameRoomProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  
  // 1. Buat "ref" untuk menunjuk ke elemen div kontainer chat
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 2. Gunakan useEffect untuk auto-scroll setiap kali chatMessages berubah
  useEffect(() => {
    if (chatContainerRef.current) {
      // Mengatur posisi scroll ke paling bawah
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]); // Efek ini akan berjalan setiap kali ada pesan baru

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVote = (playerId: string) => {
    if (gameState.phase === 'voting' && currentPlayer?.isAlive) {
      const currentVote = players.find(p => p.id === currentPlayer.id)?.votedFor;
      setSelectedPlayer(currentVote === playerId ? null : playerId);
      onVote(playerId);
    }
  };

  const handleUseAbility = (targetId: string) => {
    if (gameState.phase === 'night' && currentPlayer?.isAlive && !currentPlayer.hasUsedAbility) {
      onUseAbility(targetId);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && currentPlayer?.isAlive) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const getRoleIcon = (role: string, isCurrentPlayer: boolean = false) => {
    if (!isCurrentPlayer && currentPlayer?.role !== 'werewolf' && role === 'werewolf') {
      return '👤';
    }
    
    switch (role) {
      case 'werewolf': return '🐺';
      case 'seer': return '🔮';
      case 'doctor': return '⚕️';
      default: return '👤';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'werewolf': return 'text-red-400';
      case 'seer': return 'text-blue-400';
      case 'doctor': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const canUseAbility = () => {
    return gameState.phase === 'night' && 
           currentPlayer?.isAlive && 
           !currentPlayer.hasUsedAbility &&
           currentPlayer.role !== 'villager';
  };

  const getPhaseDescription = () => {
    switch (gameState.phase) {
      case 'day': return 'Diskusikan dan bagikan kecurigaan Anda dengan pemain lain.';
      case 'voting': return 'Vote untuk mengeliminasi pemain yang dicurigai sebagai werewolf!';
      case 'night': return 'Peran khusus dapat menggunakan kemampuan mereka sekarang.';
      case 'results': return 'Menampilkan hasil...';
      default: return '';
    }
  };

  if (gameState.winner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 border border-white/20 max-w-2xl">
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
            <h1 className="text-5xl font-bold text-white mb-4">
              {gameState.winner === 'villagers' ? 'Warga Desa Menang!' : 'Werewolf Menang!'}
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              {gameState.winner === 'villagers' 
                ? 'Semua werewolf telah dieliminasi!' 
                : 'Para werewolf telah mengambil alih desa!'}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Peran Final</h3>
                <div className="space-y-2">
                  {players.map(player => (
                    <div key={player.id} className="flex items-center justify-between text-sm">
                      <span className={player.isAlive ? 'text-white' : 'text-gray-500 line-through'}>
                        {player.name}
                      </span>
                      <span className={getRoleColor(player.role)}>
                        {getRoleIcon(player.role, true)} {player.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Statistik Game</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <div>Bertahan hingga hari ke: {gameState.dayCount}</div>
                  <div>Pemain tereliminasi: {players.filter(p => !p.isAlive).length}</div>
                  <div>Peran Anda: <span className={getRoleColor(currentPlayer?.role || 'villager')}>
                    {currentPlayer?.role}
                  </span></div>
                </div>
              </div>
            </div>
            
            <button
              onClick={onEndGame}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-8 rounded-lg transition-all transform hover:scale-105"
            >
              Kembali ke Halaman Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            {gameState.phase === 'day' || gameState.phase === 'voting' ? (
              <Sun className="w-8 h-8 text-yellow-400" />
            ) : (
              <Moon className="w-8 h-8 text-blue-400" />
            )}
            <h1 className="text-4xl font-bold text-white capitalize">
              Fase {gameState.phase}
            </h1>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <Clock className="w-5 h-5 text-white" />
              <span className="text-white font-mono text-lg">
                {formatTime(gameState.timeRemaining)}
              </span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 inline-block border border-white/20 mb-4">
            <div className="flex items-center gap-2 text-white">
              <span className="text-2xl">{getRoleIcon(currentPlayer?.role || 'villager', true)}</span>
              <span className="font-semibold">Anda adalah seorang {currentPlayer?.role}</span>
              {!currentPlayer?.isAlive && (
                <span className="text-red-400 ml-2">(Tersingkir)</span>
              )}
            </div>
          </div>
          <p className="text-gray-300">{getPhaseDescription()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-semibold text-white">
                  Pemain ({players.filter(p => p.isAlive).length} hidup)
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {players.map((player) => {
                  const hasVoted = players.find(p => p.id === currentPlayer?.id)?.votedFor === player.id;
                  const canInteract = player.isAlive && currentPlayer?.isAlive && player.id !== currentPlayer?.id && (gameState.phase === 'voting' || (gameState.phase === 'night' && canUseAbility()));

                  return (
                    <div key={player.id} className={`relative bg-white/5 backdrop-blur-sm rounded-lg p-4 border transition-all ${canInteract ? 'cursor-pointer hover:border-white/30' : ''} ${hasVoted ? 'border-purple-400 bg-purple-500/20' : 'border-white/10'} ${!player.isAlive ? 'opacity-50' : ''}`}
                      onClick={() => {
                        if (canInteract) {
                          if (gameState.phase === 'voting') handleVote(player.id);
                          else if (gameState.phase === 'night') handleUseAbility(player.id);
                        }
                      }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getRoleIcon(player.role, player.id === currentPlayer?.id)}</span>
                          <div>
                            <span className="text-white font-medium">{player.name}{player.id === currentPlayer?.id && ' (Anda)'}</span>
                            {!player.isAlive && <span className="block text-red-400 text-sm">Tersingkir</span>}
                          </div>
                        </div>
                        {player.isAlive && gameState.phase === 'voting' && (
                          <div className="flex items-center gap-2">
                            <Vote className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-300">{players.filter(p => p.votedFor === player.id).length}</span>
                            {hasVoted && <div className="w-3 h-3 bg-purple-400 rounded-full"></div>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={onEndGame} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold py-3 px-6 rounded-lg transition-all border border-red-500/30">
                  Keluar Game
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {canUseAbility() && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">Aksi Peran</h3>
                {currentPlayer?.role === 'seer' && <p className="text-gray-300 text-sm">Klik pemain untuk menginvestigasi peran mereka.</p>}
                {currentPlayer?.role === 'doctor' && <p className="text-gray-300 text-sm">Klik pemain untuk melindungi mereka dari serangan werewolf.</p>}
                {currentPlayer?.role === 'werewolf' && <p className="text-gray-300 text-sm">Klik pemain untuk memilih mereka sebagai target.</p>}
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="p-4 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">
                    Chat {gameState.phase === 'night' && currentPlayer?.role === 'werewolf' && '(Werewolves Only)'}
                  </h3>
                </div>
              </div>
              
              {/* 3. Tambahkan ref ke div kontainer chat */}
              <div ref={chatContainerRef} className="h-64 overflow-y-auto p-4 space-y-3">
                {chatMessages.filter(msg => {
                    if (gameState.phase === 'night') {
                      return msg.type === 'system' || (msg.type === 'werewolf' && currentPlayer?.role === 'werewolf');
                    }
                    return msg.type !== 'werewolf';
                  }).map((msg) => (
                    <div key={msg.id} className={`${msg.type === 'system' ? 'text-center' : ''}`}>
                      <div className={`inline-block p-2 rounded-lg ${msg.type === 'system' ? 'bg-purple-500/20 text-purple-300' : msg.type === 'werewolf' ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-white'}`}>
                        {msg.type === 'player' && <span className="font-semibold text-blue-400">{msg.player}: </span>}
                        {msg.type === 'werewolf' && <span className="font-semibold text-red-400">{msg.player} 🐺: </span>}
                        <span>{msg.message}</span>
                      </div>
                    </div>
                  ))}
              </div>
              
              {currentPlayer?.isAlive && (gameState.phase === 'day' || gameState.phase === 'voting' || (gameState.phase === 'night' && currentPlayer.role === 'werewolf')) && (
                <div className="p-4 border-t border-white/20">
                  <div className="flex gap-2">
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder={gameState.phase === 'night' && currentPlayer.role === 'werewolf' ? "Chat khusus werewolf..." : "Ketik pesan Anda..."}
                      className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400" maxLength={200} />
                    <button onClick={sendMessage} disabled={!newMessage.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50">
                      Kirim
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}