import React, { useState } from 'react';
import { ArrowLeft, Users, Gamepad2, AlertCircle } from 'lucide-react';

interface JoinGameProps {
  onBack: () => void;
  onJoin: (playerName: string, roomCode: string) => void;
  error?: string;
}

export default function JoinGame({ onBack, onJoin, error }: JoinGameProps) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      return;
    }
    
    if (!roomCode.trim()) {
      return;
    }

    if (roomCode.length < 4) {
      return;
    }

    setIsJoining(true);
    
    // Add small delay for better UX
    setTimeout(() => {
      onJoin(playerName.trim(), roomCode.trim().toUpperCase());
      setIsJoining(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-4">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Join Game</h1>
            <p className="text-gray-300">Enter the room code to join an existing game</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="playerName" className="block text-gray-300 mb-2 font-medium">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                required
                maxLength={20}
                disabled={isJoining}
              />
            </div>

            <div>
              <label htmlFor="roomCode" className="block text-gray-300 mb-2 font-medium">
                Room Code
              </label>
              <input
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 font-mono text-center text-lg transition-all"
                required
                maxLength={8}
                disabled={isJoining}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBack}
                disabled={isJoining}
                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 hover:border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              
              <button
                type="submit"
                disabled={isJoining || !playerName.trim() || !roomCode.trim() || roomCode.length < 4}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isJoining ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Joining...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Join Game
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-white font-semibold mb-2">Tips for joining:</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Ask the host for the exact room code</li>
              <li>• Room codes are 4-8 characters long</li>
              <li>• Make sure your name isn't already taken</li>
              <li>• Room must have space (max 12 players)</li>
              <li>• Game must not have started yet</li>
            </ul>
          </div>

          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-300 text-sm text-center">
              💡 <strong>Note:</strong> This demo uses localStorage for room sharing. 
              For real multiplayer, open multiple browser tabs to test!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}