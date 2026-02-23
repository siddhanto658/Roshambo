import { Move } from "../types";

const winCommentary = [
  "CRUSHING VICTORY! The competition doesn't stand a chance!",
  "TOTAL DOMINANCE! You're untouchable!",
  "TEXTBOOK EXECUTION! The crowd goes wild!",
  "FLAWLESS VICTORY! Are you even human?!",
  "ABSOLUTE ANNIHILATION! Your rival is shattered!",
  "THE HYPE IS REAL! You're on fire tonight!",
  "UNSTOPPABLE FORCE! They never saw it coming!",
  "LEGENDARY PLAY! This is what dreams are made of!",
];

const loseCommentary = [
  "DEFEAT! But every legend falls before rising again!",
  "A CLASH OF TITANS! They won this round, not the war!",
  "SO CLOSE! The margin of defeat is the margin of victory!",
  "A HUMBLING EXPERIENCE! Come back stronger!",
  "THEY GOT LUCKY! Your time will come!",
  "MOMENTARY SETBACK! Champions are made through adversity!",
  "A TOUGH BREAK! GGs, revenge is coming!",
  "GROUNDED BUT NOT BROKEN! Rise like a phoenix!",
];

const drawCommentary = [
  "A PERFECT STALEMATE! Minds equal, wills collide!",
  "THE GHOST OF BATTLE! Neither side claims victory!",
  "COSMIC BALANCE! The universe demands respect!",
  "A MIRROR MATCH! Two titans locked in eternal struggle!",
  "PATTERN RECOGNITION! Great minds think alike!",
  "THE SILENCE AFTER THE STORM! Neither flinches!",
  "PHYSICAL AND MENTAL EQUALITY! Epic showdown continues!",
  "THE LEGENDARY DRAW! The crowd is Speechless!",
];

const getMoveVerb = (move: Move, against: Move): string => {
  if (move === Move.ROCK) {
    if (against === Move.SCISSORS) return "CRUSHES";
    return "gets blocked by";
  }
  if (move === Move.PAPER) {
    if (against === Move.ROCK) return "COVERS";
    return "gets sliced by";
  }
  if (move === Move.SCISSORS) {
    if (against === Move.PAPER) return "SLICES";
    return "gets crushed by";
  }
  return "faces";
};

export const generateCommentary = async (
  myMove: Move,
  opponentMove: Move,
  winner: 'me' | 'opponent' | 'draw'
): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const moveVerb = getMoveVerb(myMove, opponentMove);
  
  if (winner === 'draw') {
    const comment = drawCommentary[Math.floor(Math.random() * drawCommentary.length)];
    return `${comment}`;
  }
  
  if (winner === 'me') {
    const comment = winCommentary[Math.floor(Math.random() * winCommentary.length)];
    return `Your ${myMove} ${moveVerb} ${opponentMove}! ${comment}`;
  }
  
  const comment = loseCommentary[Math.floor(Math.random() * loseCommentary.length)];
  return `Their ${opponentMove} counters your ${myMove}! ${comment}`;
};
