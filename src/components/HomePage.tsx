import React from 'react';
import { Play, Users, BookOpen, Trophy } from 'lucide-react';

interface HomePageProps {
  onCreateGame: () => void;
  onJoinGame: () => void;
}

export default function HomePage({ onCreateGame, onJoinGame }: HomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-block p-4 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6 animate-pulse">
                <span className="text-6xl">🐺</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Werewolf
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
                The ultimate social deduction game. Uncover the truth, survive the night, and eliminate the werewolves among you.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onCreateGame}
                className="group relative px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center gap-3">
                  <Play className="w-6 h-6" />
                  <span className="text-lg">Create Game</span>
                </div>
              </button>
              
              <button
                onClick={onJoinGame}
                className="group relative px-8 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6" />
                  <span className="text-lg">Join Game</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 hover:bg-white/15 transition-all transform hover:scale-105">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Multiplayer</h3>
              <p className="text-gray-300">
                Play with 4-12 players in real-time. Create private rooms or join public games with friends and strangers.
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 hover:bg-white/15 transition-all transform hover:scale-105">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-6">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Multiple Roles</h3>
              <p className="text-gray-300">
                Experience different roles including Werewolf, Villager, Seer, Doctor, and more. Each role has unique abilities.
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 hover:bg-white/15 transition-all transform hover:scale-105">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full mb-6">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Real-time Play</h3>
              <p className="text-gray-300">
                Experience timed phases, automatic transitions, and real-time voting with comprehensive game mechanics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How to Play Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">How to Play</h2>
          <p className="text-xl text-gray-300">Learn the basics of Werewolf in minutes</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-all">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Get Your Role</h3>
              <p className="text-gray-300 text-sm">
                Each player receives a secret role card. Don't reveal it to anyone!
              </p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-all">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Night Phase</h3>
              <p className="text-gray-300 text-sm">
                Werewolves secretly choose a victim. Special roles use their abilities.
              </p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-all">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Day Phase</h3>
              <p className="text-gray-300 text-sm">
                Discuss, debate, and vote to eliminate suspected werewolves.
              </p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-all">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">4</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Win or Lose</h3>
              <p className="text-gray-300 text-sm">
                Villagers win by eliminating all werewolves. Werewolves win by outnumbering villagers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}