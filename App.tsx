import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Move, PeerMessage, PlayerRole, Score } from './types';
import { SlotMachine } from './components/SlotMachine';
import { generateCommentary } from './services/geminiService';
import { Copy, Users, Play, Trophy, Zap, Clock, CheckCircle, Circle, Bot, Shuffle, Edit2, Check, X, ArrowLeft } from 'lucide-react';

declare const Peer: any;

type GameMode = 'PRIVATE' | 'RANDOM' | 'AI';

const VEGETABLE_NAMES = [
  'Carrot', 'Broccoli', 'Potato', 'Tomato', 'Onion', 'Celery', 'Cabbage', 'Lettuce',
  'Pepper', 'Cucumber', 'Radish', 'Beet', 'Turnip', 'Parsnip', 'Squash', 'Zucchini',
  'Eggplant', 'Spinach', 'Kale', 'Chard', 'Asparagus', 'Corn', 'Pea', 'Bean'
];

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const getRandomVegetable = () => VEGETABLE_NAMES[Math.floor(Math.random() * VEGETABLE_NAMES.length)];

export default function App() {
  const [peerId, setPeerId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [targetRoomCode, setTargetRoomCode] = useState<string>('');
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY);
  const [gameMode, setGameMode] = useState<GameMode>('PRIVATE');
  const [role, setRole] = useState<PlayerRole | null>(null);
  
  const [myName, setMyName] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('Rival');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  const [myMove, setMyMove] = useState<Move | null>(null);
  const [opponentMove, setOpponentMove] = useState<Move | null>(null);
  const [opponentHasSelected, setOpponentHasSelected] = useState(false);
  const [score, setScore] = useState<Score>({ me: 0, opponent: 0 });
  const [commentary, setCommentary] = useState<string>('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSE' | 'DRAW' | null>(null);
  const [timer, setTimer] = useState<number>(20);
  const [isSearching, setIsSearching] = useState(false);

  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const matchmakingPeerRef = useRef<any>(null);

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
    const vegName = getRandomVegetable();
    setMyName(vegName);
    const code = generateRoomCode();
    setRoomCode(code);
    const newPeer = new Peer(`roshambo-${code}`);
    
    newPeer.on('open', () => {
      setPeerId(code);
    });

    newPeer.on('connection', (conn: any) => {
      if (gameMode === 'RANDOM' || gameMode === 'PRIVATE') {
        connRef.current = conn;
        setupConnectionHandlers(conn);
        setRole(PlayerRole.HOST);
        setGameState(GameState.PLAYING);
        startGame();
      }
    });

    peerRef.current = newPeer;

    return () => {
      newPeer.destroy();
      stopTimer();
      if (matchmakingPeerRef.current) {
        matchmakingPeerRef.current.destroy();
      }
    };
  }, [gameMode]);

  const startGame = () => {
    setMyMove(null);
    setOpponentMove(null);
    setOpponentHasSelected(false);
    setScore({ me: 0, opponent: 0 });
    setGameResult(null);
    setCommentary('');
    setGameState(GameState.PLAYING);
    startTimer();
  };

  const setupConnectionHandlers = (conn: any) => {
    conn.on('data', (data: PeerMessage) => {
      if (data.type === 'OPPONENT_NAME') {
        setOpponentName(data.payload);
      }
      handleData(data);
    });

    conn.on('open', () => {
      if (connRef.current) {
        connRef.current.send({ type: 'OPPONENT_NAME', payload: myName });
      }
    });
    
    conn.on('close', () => {
      if (gameMode !== 'AI') {
        alert('Opponent disconnected');
        resetGame();
      }
    });
    
    conn.on('error', () => {
      if (gameMode !== 'AI') {
        alert('Connection error');
        resetGame();
      }
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
    setOpponentName(gameMode === 'AI' ? 'Bot' : 'Rival');
    stopTimer();
    setIsSearching(false);
  };

  const joinGame = () => {
    if (!targetRoomCode || !peerRef.current) return;
    const conn = peerRef.current.connect(`roshambo-${targetRoomCode.toUpperCase()}`);
    connRef.current = conn;
    setupConnectionHandlers(conn);
    setRole(PlayerRole.GUEST);
    setGameState(GameState.PLAYING);
    startGame();
  };

  const startRandomMatchmaking = () => {
    setIsSearching(true);
    const matchPeer = new Peer('roshambo-matchmaking');
    matchmakingPeerRef.current = matchPeer;

    matchPeer.on('open', () => {
      matchPeer.listAllPeers((peers: string[]) => {
        const availableHosts = peers.filter(p => p.startsWith('roshambo-') && !p.includes('matchmaking'));
        if (availableHosts.length > 0) {
          const randomHost = availableHosts[Math.floor(Math.random() * availableHosts.length)];
          const conn = matchPeer.connect(randomHost);
          connRef.current = conn;
          setupConnectionHandlers(conn);
          setRole(PlayerRole.GUEST);
          setGameState(GameState.PLAYING);
          setIsSearching(false);
          startGame();
        } else {
          alert('No players available. Try again or start a private game!');
          setIsSearching(false);
        }
      });
    });
  };

  const startAIMode = () => {
    setGameMode('AI');
    setOpponentName('Bot');
    setGameState(GameState.PLAYING);
    startGame();
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
      if (gameMode === 'AI') {
        const moves = [Move.ROCK, Move.PAPER, Move.SCISSORS];
        const aiMove = moves[Math.floor(Math.random() * moves.length)];
        setOpponentMove(aiMove);
        setGameState(GameState.REVEAL);
        stopTimer();
      } else if (connRef.current && myMove) {
        connRef.current.send({
          type: 'REVEAL_MOVE',
          payload: myMove
        });
        stopTimer();
      }
    }
  }, [gameState, myMove, gameMode]);

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
      if (gameMode === 'AI' && prev === GameState.PLAYING) {
        return GameState.BOTH_LOCKED;
      }
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
    if (gameMode === 'AI') {
      setOpponentName('Bot');
    }
    startTimer();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    alert("Room code copied!");
  };

  const saveName = () => {
    if (tempName.trim()) {
      setMyName(tempName.trim());
    }
    setIsEditingName(false);
  };

  const cancelEdit = () => {
    setTempName(myName);
    setIsEditingName(false);
  };

  const isPlaying = gameState === GameState.PLAYING || gameState === GameState.OPPONENT_LOCKED;

  if (gameState === GameState.LOBBY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-grid">
        <div className="card-glass w-full max-w-lg rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="text-center mb-6 relative z-10">
            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-gradient mb-4">
              ROSHAMBO
              <span className="block text-3xl md:text-4xl text-white font-thin tracking-[0.3em] not-italic mt-2">LIVE</span>
            </h1>
            <p className="text-slate-400 font-mono text-sm">MULTIPLAYER ARCADE BATTLE</p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10">
              {isEditingName ? (
                <>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value.slice(0, 12))}
                    maxLength={12}
                    className="bg-transparent text-white text-center font-bold w-28 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={saveName} className="text-emerald-400"><Check size={16} /></button>
                  <button onClick={cancelEdit} className="text-red-400"><X size={16} /></button>
                </>
              ) : (
                <>
                  <span className="text-white font-bold">{myName}</span>
                  <button onClick={() => { setTempName(myName); setIsEditingName(true); }} className="text-slate-400 hover:text-white">
                    <Edit2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
              <label className="text-[10px] text-violet-400 font-bold uppercase tracking-widest flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse"></div>
                Private Room
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/60 p-3 rounded-lg border border-white/10 font-mono text-xl text-center tracking-[0.3em] text-white">
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

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter code..."
                value={targetRoomCode}
                onChange={(e) => setTargetRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                maxLength={6}
                className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-center text-lg font-mono tracking-[0.3em] uppercase focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 placeholder-slate-600"
              />
              <button 
                onClick={joinGame}
                disabled={targetRoomCode.length !== 6}
                className="btn-primary disabled:opacity-50 text-white px-5 rounded-xl font-bold"
              >
                JOIN
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent flex-1"></div>
              <span className="text-slate-500 font-mono text-xs">OR</span>
              <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent flex-1"></div>
            </div>

            <button
              onClick={startRandomMatchmaking}
              disabled={isSearching}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 font-bold text-white flex items-center justify-center gap-2 transition-all"
            >
              <Shuffle size={20} />
              {isSearching ? 'SEARCHING...' : 'RANDOM MATCH'}
            </button>

            <button
              onClick={startAIMode}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-bold text-white flex items-center justify-center gap-2 transition-all"
            >
              <Bot size={20} />
              PLAY VS AI
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-slate-200 bg-grid">
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 card-glass rounded-full px-6 py-2 flex items-center gap-6">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">YOU</span>
          <span className="text-2xl font-black font-mono leading-none text-white">{score.me}</span>
        </div>
        
        <div className="w-px h-8 bg-slate-700"></div>
        
        <div className="flex items-center gap-2 text-violet-400">
          <Trophy size={16} />
        </div>

        <div className="w-px h-8 bg-slate-700"></div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1">{opponentName.toUpperCase()}</span>
          <span className="text-2xl font-black font-mono leading-none text-white">{score.opponent}</span>
        </div>

        <div className="w-px h-8 bg-slate-700"></div>

        <div className={`flex flex-col items-center ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
          <Clock size={14} />
          <span className="text-lg font-black font-mono">{timer}s</span>
        </div>

        {gameMode !== 'AI' && (
          <>
            <div className="w-px h-8 bg-slate-700"></div>
            <button
              onClick={resetGame}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
          </>
        )}
      </header>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 p-6 pt-24 pb-32">
        <div className={`transition-all duration-500 ${gameResult === 'WIN' ? 'scale-110 z-10' : gameResult === 'LOSE' ? 'scale-90 opacity-60 grayscale-[0.5]' : ''}`}>
          <SlotMachine 
            label={myName.toUpperCase()}
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
            label={gameMode === 'AI' ? 'BOT' : opponentName.toUpperCase()}
            isSpinning={false}
            onSelect={() => {}}
            finalMove={opponentMove}
            disabled={true}
            isOpponent={true}
            hasSelected={opponentHasSelected || (gameMode === 'AI' && gameState === GameState.BOTH_LOCKED)}
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
                <span className="text-[10px] text-slate-500 font-mono">{myName.toUpperCase().slice(0, 6)}</span>
                <div className="w-3"></div>
                {opponentHasSelected || (gameMode === 'AI' && gameState === GameState.BOTH_LOCKED) ? (
                  <CheckCircle size={12} className="text-emerald-400" />
                ) : (
                  <Circle size={12} className="text-slate-600" />
                )}
                <span className="text-[10px] text-slate-500 font-mono">{gameMode === 'AI' ? 'BOT' : opponentName.toUpperCase().slice(0, 6)}</span>
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
