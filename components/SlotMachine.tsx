import React, { useEffect, useState, useRef } from 'react';
import { Move } from '../types';
import { SlotIcon } from './SlotIcon';

interface SlotMachineProps {
  isSpinning: boolean;
  onSelect: (move: Move) => void;
  finalMove: Move | null;
  disabled: boolean;
  label?: string;
  isOpponent?: boolean;
  hasSelected?: boolean;
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ 
  isSpinning, 
  onSelect, 
  finalMove, 
  disabled,
  label,
  isOpponent = false,
  hasSelected = false
}) => {
  const [currentIcon, setCurrentIcon] = useState<Move>(Move.ROCK);
  const moves = [Move.ROCK, Move.PAPER, Move.SCISSORS];
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isSpinning && !finalMove) {
      intervalRef.current = window.setInterval(() => {
        setCurrentIcon(prev => {
          const currentIndex = moves.indexOf(prev);
          return moves[(currentIndex + 1) % moves.length];
        });
      }, 80); // Fast spin
    } else if (finalMove) {
      setCurrentIcon(finalMove);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
       if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSpinning, finalMove]);

  const handleStop = () => {
    if (!disabled && isSpinning && !isOpponent) {
      onSelect(currentIcon);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Label Badge */}
      <div className={`
        px-4 py-1 rounded-full text-xs font-bold tracking-[0.2em] uppercase mb-4 border
        ${isOpponent ? 'bg-red-950/50 border-red-800 text-red-400' : 'bg-cyan-950/50 border-cyan-800 text-cyan-400'}
      `}>
        {label}
      </div>
      
      <div className="relative group">
        {/* Outer Glow */}
        <div className={`
          absolute -inset-0.5 rounded-3xl blur opacity-30 transition duration-500
          ${isSpinning ? 'bg-gradient-to-b from-cyan-400 to-purple-600 opacity-60 animate-pulse' : 'bg-slate-700'}
        `}></div>
        
        {/* Machine Housing */}
        <div className="relative bg-slate-900 rounded-3xl p-2 border border-slate-700 shadow-2xl">
          {/* Screen Bezel */}
          <div className="bg-black rounded-2xl p-4 slot-machine-window relative overflow-hidden">
             
             {/* Scanlines overlay */}
             <div className="absolute inset-0 scanlines opacity-20 pointer-events-none z-10"></div>
             
             {/* The Icon */}
             <div className="relative z-0">
               <SlotIcon 
                 move={currentIcon} 
                 size="lg" 
                 isRevealed={!isOpponent || !!finalMove} 
                 className={isSpinning ? 'blur-[1px]' : ''}
               />
             </div>

             {/* Reflection glint */}
             <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>

      {/* Controls Area */}
      <div className="h-24 flex items-center justify-center w-full mt-6">
        {isOpponent ? (
          <div className="flex flex-col items-center gap-2">
            {hasSelected || finalMove ? (
              <div className="px-4 py-2 bg-emerald-900/50 rounded border border-emerald-600 text-emerald-400 text-sm font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                LOCKED IN
              </div>
            ) : (
              <div className="px-4 py-2 bg-slate-800 rounded border border-slate-600 text-slate-400 text-sm font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></span>
                SELECTING...
              </div>
            )}
          </div>
        ) : (
          <>
            {isSpinning && !finalMove ? (
              <button 
                onClick={handleStop}
                className="group relative px-8 py-4 bg-red-600 text-white font-black rounded-xl shadow-[0_10px_0_rgb(153,27,27)] active:shadow-none active:translate-y-[10px] transition-all uppercase tracking-wider"
              >
                <span className="absolute inset-0 rounded-xl border-2 border-white/20"></span>
                STOP & LOCK
              </button>
            ) : finalMove ? (
                <div className="flex flex-col items-center animate-bounce">
                  <div className="text-emerald-400 font-bold text-xl drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">LOCKED IN</div>
                  <div className="text-xs text-slate-500 font-mono mt-1">WAITING FOR REVEAL</div>
                </div>
            ) : (
                 <div className="text-slate-500 text-sm font-mono">WAITING FOR START...</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
