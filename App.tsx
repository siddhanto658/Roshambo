import React, { useState, useEffect, useRef } from 'react';
import { GameState, Move, PeerMessage, PlayerRole, Score } from './types';
import { SlotMachine } from './components/SlotMachine';
import { generateCommentary } from './services/geminiService';
import { Copy, Users, Play, Radio, Trophy, Zap } from 'lucide-react';

// Access global Peer
declare const Peer: any;

export default function App() {
  const [peerId, setPeerId] = useState<string>('');
  const [targetPeerId, setTargetPeerId] = useState<string>('');
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY);
  const [role, setRole] = useState<PlayerRole | null>(null);
  
  // Game Logic State
  const [myMove, setMyMove] = useState<Move | null>(null);
  const [opponentMove, setOpponentMove] = useState<Move | null>(null);
  const [score, setScore] = useState<Score>({ me: 0, opponent: 0 });
  const [commentary, setCommentary] = useState<string>('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSE' | 'DRAW' | null>(null);

  // Refs for PeerJS
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);

  // Initialize PeerJS on mount
  useEffect(() => {
    const newPeer = new Peer();
    
    newPeer.on('open', (id: string) => {
      setPeerId(id);
    });

    newPeer.on('connection', (conn: any) => {
      connRef.current = conn;
      setupConnectionHandlers(conn);
      setRole(PlayerRole.HOST);
      setGameState(GameState.PLAYING);
    });

    peerRef.current = newPeer;

    return () => {
      newPeer.destroy();
    };
  }, []);

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
    setScore({ me: 0, opponent: 0 });
    setGameResult(null);
    setCommentary('');
  };

  const joinGame = () => {
    if (!targetPeerId || !peerRef.current) return;
    const conn = peerRef.current.connect(targetPeerId);
    connRef.current = conn;
    setupConnectionHandlers(conn);
    setRole(PlayerRole.GUEST);
    setGameState(GameState.PLAYING);
  };

  const handleData = (data: PeerMessage) => {
    switch (data.type) {
      case 'MOVE_COMMITTED':
        setGameState(prev => {
           if (prev === GameState.LOCKED) return GameState.BOTH_LOCKED;
           return GameState.OPPONENT_LOCKED;
        });
        break;

      case 'REVEAL_MOVE':
        const oppMove = data.payload as Move;
        setOpponentMove(oppMove);
        setGameState(GameState.REVEAL);
        break;

      case 'PLAY_AGAIN':
        setMyMove(null);
        setOpponentMove(null);
        setGameResult(null);
        setCommentary('');
        setGameState(GameState.PLAYING);
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
    }
  }, [gameState, myMove]);

  useEffect(() => {
    if (gameState === GameState.REVEAL && myMove && opponentMove) {
      determineWinner(myMove, opponentMove);
    }
  }, [gameState, opponentMove]);

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
    setGameResult(null);
    setCommentary('');
    setGameState(GameState.PLAYING);
    if (connRef.current) {
      connRef.current.send({ type: 'PLAY_AGAIN' });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(peerId);
    alert("Room ID copied!");
  };

  // --- LOBBY VIEW ---
  if (gameState === GameState.LOBBY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 animate-float">
        <div className="glass-panel w-full max-w-lg rounded-3xl p-8 md:p-12 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="text-center mb-10 relative z-10">
            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter bg-gradient-to-r from-violet-400 via-fuchsia-400 to-white bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(167,139,250,0.5)] mb-4">
              ROSHAMBO
              <span className="block text-3xl md:text-4xl text-white font-thin tracking-[0.3em] not-italic mt-2">LIVE</span>
            </h1>
            <p className="text-slate-400 font-mono text-sm">MULTIPLAYER ARCADE BATTLE</p>
          </div>

          <div className="space-y-8 relative z-10">
            {/* Host Section */}
            <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
              <label className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-2 mb-3">
                 <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                 Your Game ID
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/60 p-3 rounded-lg border border-white/10 font-mono text-slate-300 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                  {peerId || 'INITIALIZING UPLINK...'}
                </div>
                <button 
                  onClick={copyToClipboard}
                  disabled={!peerId}
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

            {/* Join Section */}
            <div>
              <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-3 block">
                 Join Rival
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Paste Room ID..."
                  value={targetPeerId}
                  onChange={(e) => setTargetPeerId(e.target.value)}
                  className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 placeholder-slate-600 font-mono text-sm transition-all"
                />
                <button 
                  onClick={joinGame}
                  disabled={!targetPeerId}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:grayscale text-white px-6 rounded-xl font-bold tracking-wide transition-all shadow-lg shadow-cyan-900/20"
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

  // --- GAME VIEW ---
  const isPlaying = gameState === GameState.PLAYING || gameState === GameState.OPPONENT_LOCKED;
  const isOpponentReady = gameState === GameState.OPPONENT_LOCKED || gameState === GameState.BOTH_LOCKED || gameState === GameState.REVEAL;

  return (
    <div className="min-h-screen flex flex-col text-slate-200">
      
      {/* HEADER HUD */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-full px-8 py-3 flex items-center gap-8 shadow-2xl">
        <div className="flex flex-col items-center">
             <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">YOU</span>
             <span className="text-3xl font-black font-mono leading-none text-white drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">{score.me}</span>
        </div>
        
        <div className="w-px h-8 bg-slate-700"></div>
        
        <div className="flex items-center gap-2 text-violet-400">
             <Trophy size={16} />
        </div>

        <div className="w-px h-8 bg-slate-700"></div>

        <div className="flex flex-col items-center">
             <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1">RIVAL</span>
             <span className="text-3xl font-black font-mono leading-none text-white drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]">{score.opponent}</span>
        </div>
      </header>

      {/* GAME ARENA */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 p-6 pt-24 pb-32">
        
        {/* MY MACHINE */}
        <div className={`transition-all duration-500 ${gameResult === 'WIN' ? 'scale-110 z-10' : gameResult === 'LOSE' ? 'scale-90 opacity-60 grayscale-[0.5]' : ''}`}>
           <SlotMachine 
            label="PLAYER 1 (YOU)"
            isSpinning={isPlaying}
            onSelect={handleMySelect}
            finalMove={myMove}
            disabled={!isPlaying}
          />
        </div>

        {/* VS CENTER */}
        <div className="relative z-20 flex flex-col items-center justify-center min-w-[120px]">
            {gameResult ? (
               <div className="text-center animate-[bounce_1s_infinite]">
                  <div className={`
                    text-5xl md:text-7xl font-black italic uppercase tracking-tighter drop-shadow-2xl
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

        {/* OPPONENT MACHINE */}
        <div className={`transition-all duration-500 ${gameResult === 'LOSE' ? 'scale-110 z-10' : gameResult === 'WIN' ? 'scale-90 opacity-60 grayscale-[0.5]' : ''}`}>
           <SlotMachine 
            label="PLAYER 2 (RIVAL)"
            isSpinning={false}
            onSelect={() => {}}
            finalMove={opponentMove} // This is null until REVEAL
            disabled={true}
            isOpponent={true}
          />
        </div>

      </main>

      {/* COMMENTARY TERMINAL */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 flex justify-center z-40">
        <div className="w-full max-w-2xl bg-black/80 backdrop-blur-md border border-violet-500/30 rounded-t-2xl p-1 shadow-2xl">
           <div className="bg-slate-900/90 rounded-t-xl p-4 min-h-[100px] flex flex-col relative overflow-hidden">
               <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500"></div>
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">AI_ANNOUNCER_V3.0</span>
                  </div>
                  <div className="flex gap-1">
                     <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                     <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                     <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
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