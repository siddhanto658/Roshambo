import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Move, PeerMessage, PlayerRole, Score } from './types';
import { SlotMachine } from './components/SlotMachine';
import { generateCommentary } from './services/geminiService';
import { Copy, Users, Play, Trophy, Zap, Clock, CheckCircle, Circle } from 'lucide-react';

declare const Peer: any;

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function App() {
  const [peerId, setPeerId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [targetRoomCode, setTargetRoomCode] = useState<string>('');
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY);
  const [role, setRole] = useState<PlayerRole | null>(null);
  
  const [myMove, setMyMove] = useState<Move | null>(null);
  const [opponentMove, setOpponentMove] = useState<Move | null>(null);
  const [opponentHasSelected, setOpponentHasSelected] = useState(false);
  const [score, setScore] = useState<Score>({ me: 0, opponent: 0 });
  const [commentary, setCommentary] = useState<string>('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSE' | 'DRAW' | null>(null);
  const [timer, setTimer] = useState<number>(20);

  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    setTimer(20);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    const code = generateRoomCode();
    setRoomCode(code);
    const newPeer = new Peer(`roshambo-${code}`);
    
    newPeer.on('open', () => {
      setPeerId(code);
    });

    newPeer.on('connection', (conn: any) => {
      connRef.current = conn;
      setupConnectionHandlers(conn);
      setRole(PlayerRole.HOST);
      setGameState(GameState.PLAYING);
      setMyMove(null);
      setOpponentMove(null);
      setOpponentHasSelected(false);
      startTimer();
    });

    peerRef.current = newPeer;

    return () => {
      newPeer.destroy();
      stopTimer();
    };
  }, [startTimer, stopTimer]);

  const setupConnectionHandlers = (conn: any) => {
    conn.on('data', (data: PeerMessage) => {
      handleData(data);
    });

    conn.on('open', () => {
      console.log('Connected to peer');
    });
    
    conn.on('close', () => {
      alert('Opponent disconnected');
      resetGame();
    });
    
    conn.on('error', () => {
      alert('Connection error');
      resetGame();
    });
  };

  const resetGame = () => {
    setGameState(GameState.LOBBY);
    setRole(null);
    setMyMove(null);
    setOpponentMove(null);
    setOpponentHasSelected(false);
    setScore({ me: 0, opponent: 0 });
    setGameResult(null);
    setCommentary('');
    stopTimer();
  };

  const joinGame = () => {
    if (!targetRoomCode || !peerRef.current) return;
    const conn = peerRef.current.connect(`roshambo-${targetRoomCode.toUpperCase()}`);
    connRef.current = conn;
    setupConnectionHandlers(conn);
    setRole(PlayerRole.GUEST);
    setGameState(GameState.PLAYING);
    setMyMove(null);
    setOpponentMove(null);
    setOpponentHasSelected(false);
    startTimer();
  };

  const handleData = (data: PeerMessage) => {
    switch (data.type) {
      case 'MOVE_COMMITTED':
        setOpponentHasSelected(true);
        setGameState(prev => {
          if (prev === GameState.LOCKED) return GameState.BOTH_LOCKED;
          return GameState.OPPONENT_LOCKED;
        });
        break;

      case 'REVEAL_MOVE':
        const oppMove = data.payload as Move;
        setOpponentMove(oppMove);
        setGameState(GameState.REVEAL);
        stopTimer();
        break;

      case 'PLAY_AGAIN':
        setMyMove(null);
        setOpponentMove(null);
        setOpponentHasSelected(false);
        setGameResult(null);
        setCommentary('');
        setGameState(GameState.PLAYING);
        startTimer();
        break;
    }
  };

  useEffect(() => {
    if (gameState === GameState.BOTH_LOCKED) {
      if (connRef.current && myMove) {
        connRef.current.send({
          type: 'REVEAL_MOVE',
          payload: myMove
        });
      }
      stopTimer();
    }
  }, [gameState, myMove, stopTimer]);

  useEffect(() => {
    if (gameState === GameState.REVEAL && myMove && opponentMove) {
      determineWinner(myMove, opponentMove);
    }
  }, [gameState, opponentMove]);

  useEffect(() => {
    if (timer === 0 && gameState === GameState.PLAYING) {
      if (!myMove) {
        const moves = [Move.ROCK, Move.PAPER, Move.SCISSORS];
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        handleMySelect(randomMove);
      }
    }
  }, [timer, gameState, myMove]);

  const determineWinner = async (me: Move, opp: Move) => {
    let result: 'me' | 'opponent' | 'draw' = 'draw';

    if (me === opp) {
      result = 'draw';
      setGameResult('DRAW');
    } else if (
      (me === Move.ROCK && opp === Move.SCISSORS) ||
      (me === Move.PAPER && opp === Move.ROCK) ||
      (me === Move.SCISSORS && opp === Move.PAPER)
    ) {
      result = 'me';
      setGameResult('WIN');
      setScore(s => ({ ...s, me: s.me + 1 }));
    } else {
      result = 'opponent';
      setGameResult('LOSE');
      setScore(s => ({ ...s, opponent: s.opponent + 1 }));
    }

    setIsProcessingAI(true);
    const comment = await generateCommentary(me, opp, result);
    setCommentary(comment);
    setIsProcessingAI(false);
  };

  const handleMySelect = (move: Move) => {
    setMyMove(move);
    if (connRef.current) {
      connRef.current.send({ type: 'MOVE_COMMITTED' });
    }
    setGameState(prev => {
      if (prev === GameState.OPPONENT_LOCKED) return GameState.BOTH_LOCKED;
      return GameState.LOCKED;
    });
  };

  const handlePlayAgain = () => {
    setMyMove(null);
    setOpponentMove(null);
    setOpponentHasSelected(false);
    setGameResult(null);
    setCommentary('');
    setGameState(GameState.PLAYING);
    if (connRef.current) {
      connRef.current.send({ type: 'PLAY_AGAIN' });
    }
    startTimer();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    alert("Room code copied!");
  };

  const isPlaying = gameState === GameState.PLAYING || gameState === GameState.OPPONENT_LOCKED;

  if (gameState === GameState.LOBBY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-grid">
        <div className="card-glass w-full max-w-lg rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="text-center mb-10 relative z-10">
            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-gradient mb-4">
              ROSHAMBO
              <span className="block text-3xl md:text-4xl text-white font-thin tracking-[0.3em] not-italic mt-2">LIVE</span>
            </h1>
            <p className="text-slate-400 font-mono text-sm">MULTIPLAYER ARCADE BATTLE</p>
          </div>

          <div className="space-y-8 relative z-10">
            <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
              <label className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                Your Room Code
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/60 p-4 rounded-lg border border-white/10 font-mono text-2xl text-center tracking-[0.3em] text-white">
                  {roomCode || '......'}
                </div>
                <button 
                  onClick={copyToClipboard}
                  disabled={!roomCode}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors border border-slate-700"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent flex-1"></div>
              <span className="text-slate-500 font-mono text-xs">VS</span>
              <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent flex-1"></div>
            </div>

            <div>
              <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-3 block">
                Join Rival
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter 6-char code..."
                  value={targetRoomCode}
                  onChange={(e) => setTargetRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                  maxLength={6}
                  className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-center text-xl font-mono tracking-[0.3em] uppercase focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 placeholder-slate-600 transition-all"
                />
                <button 
                  onClick={joinGame}
                  disabled={targetRoomCode.length !== 6}
                  className="btn-primary disabled:opacity-50 disabled:grayscale text-white px-6 rounded-xl font-bold tracking-wide transition-all"
                >
                  FIGHT
                </button>
              </div>
            </div>
            
            <div className="flex justify-center mt-6">
              <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-[10px] text-slate-400">
                <Users size={12} />
                <span>2 PLAYER P2P CONNECTION</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-slate-200 bg-grid">
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 card-glass rounded-full px-8 py-3 flex items-center gap-8">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">YOU</span>
          <span className="text-3xl font-black font-mono leading-none text-white">{score.me}</span>
        </div>
        
        <div className="w-px h-8 bg-slate-700"></div>
        
        <div className="flex items-center gap-2 text-violet-400">
          <Trophy size={16} />
        </div>

        <div className="w-px h-8 bg-slate-700"></div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1">RIVAL</span>
          <span className="text-3xl font-black font-mono leading-none text-white">{score.opponent}</span>
        </div>

        <div className="w-px h-8 bg-slate-700"></div>

        <div className={`flex flex-col items-center ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
          <Clock size={16} />
          <span className="text-xl font-black font-mono">{timer}s</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 p-6 pt-24 pb-32">
        <div className={`transition-all duration-500 ${gameResult === 'WIN' ? 'scale-110 z-10' : gameResult === 'LOSE' ? 'scale-90 opacity-60 grayscale-[0.5]' : ''}`}>
          <SlotMachine 
            label="PLAYER 1 (YOU)"
            isSpinning={isPlaying}
            onSelect={handleMySelect}
            finalMove={myMove}
            disabled={!isPlaying}
            hasSelected={!!myMove}
          />
        </div>

        <div className="relative z-20 flex flex-col items-center justify-center min-w-[120px]">
          {gameResult ? (
            <div className="text-center winner-glow">
              <div className={`
                text-5xl md:text-7xl font-black italic uppercase tracking-tighter
                ${gameResult === 'WIN' ? 'text-emerald-400 drop-shadow-[0_0_25px_rgba(52,211,153,0.6)]' : 
                  gameResult === 'LOSE' ? 'text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]' : 
                  'text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.6)]'}
              `}>
                {gameResult === 'WIN' ? 'VICTORY' : gameResult === 'LOSE' ? 'DEFEAT' : 'DRAW'}
              </div>
              <button 
                onClick={handlePlayAgain}
                className="mt-8 px-8 py-3 rounded-full bg-white text-black font-bold flex items-center gap-2 mx-auto hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              >
                <Play size={18} fill="black" />
                REMATCH
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500 blur-[40px] opacity-20 animate-pulse"></div>
              <div className="text-6xl font-black italic text-slate-800 -skew-x-12 select-none opacity-50">VS</div>
            </div>
          )}
        </div>

        <div className={`transition-all duration-500 ${gameResult === 'LOSE' ? 'scale-110 z-10' : gameResult === 'WIN' ? 'scale-90 opacity-60 grayscale-[0.5]' : ''}`}>
          <SlotMachine 
            label="PLAYER 2 (RIVAL)"
            isSpinning={false}
            onSelect={() => {}}
            finalMove={opponentMove}
            disabled={true}
            isOpponent={true}
            hasSelected={opponentHasSelected}
          />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 flex justify-center z-40">
        <div className="w-full max-w-2xl bg-black/80 backdrop-blur-md border border-violet-500/30 rounded-t-2xl p-1 shadow-2xl">
          <div className="bg-slate-900/90 rounded-t-xl p-4 min-h-[100px] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500"></div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">AI ANNOUNCER</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle size={12} className={myMove ? 'text-emerald-400' : 'text-slate-600'} />
                <span className="text-[10px] text-slate-500 font-mono">YOU</span>
                <div className="w-3"></div>
                {opponentHasSelected ? (
                  <CheckCircle size={12} className="text-emerald-400" />
                ) : (
                  <Circle size={12} className="text-slate-600" />
                )}
                <span className="text-[10px] text-slate-500 font-mono">RIVAL</span>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              {isProcessingAI ? (
                <div className="font-mono text-violet-400 text-sm animate-pulse">ANALYZING MATCH DATA...</div>
              ) : (
                <p className="font-mono text-lg md:text-xl text-white text-center leading-relaxed">
                  {commentary ? `"${commentary}"` : <span className="text-slate-600 italic opacity-50">Waiting for battle results...</span>}
                </p>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
