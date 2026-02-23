// Declare global PeerJS since we are loading it via CDN
declare const Peer: any;

export enum Move {
  ROCK = 'ROCK',
  PAPER = 'PAPER',
  SCISSORS = 'SCISSORS',
}

export enum GameState {
  LOBBY = 'LOBBY',
  WAITING_FOR_OPPONENT = 'WAITING_FOR_OPPONENT',
  PLAYING = 'PLAYING',
  LOCKED = 'LOCKED', // Local player locked
  OPPONENT_LOCKED = 'OPPONENT_LOCKED', // Opponent locked
  BOTH_LOCKED = 'BOTH_LOCKED', // Waiting to reveal
  REVEAL = 'REVEAL',
}

export enum PlayerRole {
  HOST = 'HOST',
  GUEST = 'GUEST',
}

export interface PeerMessage {
  type: 'CONNECT' | 'MOVE_COMMITTED' | 'REVEAL_MOVE' | 'PLAY_AGAIN' | 'OPPONENT_NAME';
  payload?: any;
}

export interface Score {
  me: number;
  opponent: number;
}
