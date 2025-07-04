export interface Player {
  id: string;
  name: string;
  role: 'werewolf' | 'villager' | 'seer' | 'doctor';
  isAlive: boolean;
  isHost: boolean;
  isReady: boolean;
  votes: number;
  votedFor?: string;
  hasUsedAbility?: boolean;
}

export interface GameState {
  phase: 'day' | 'night' | 'voting' | 'results' | 'lobby';
  dayCount: number;
  timeRemaining: number;
  winner?: 'werewolves' | 'villagers';
  lastEliminated?: string;
  nightActions: {
    werewolfTarget?: string;
    doctorTarget?: string;
    seerTarget?: string;
  };
}

export interface ChatMessage {
  id: string;
  player: string;
  message: string;
  type: 'player' | 'system' | 'werewolf';
  timestamp: number;
}

export interface GameSettings {
  werewolves: number;
  villagers: number;
  seer: number;
  doctor: number;
  dayDuration: number;
  nightDuration: number;
}

export interface GameRoom {
  code: string;
  host: string;
  players: Player[];
  gameState: GameState;
  chatMessages: ChatMessage[];
  settings: GameSettings;
}