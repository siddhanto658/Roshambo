import React from 'react';
import { Move } from '../types';

interface SlotIconProps {
  move: Move | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isRevealed?: boolean;
}

export const SlotIcon: React.FC<SlotIconProps> = ({ move, size = 'md', className = '', isRevealed = true }) => {
  const sizeClasses = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-20 h-20 text-4xl',
    lg: 'w-32 h-32 md:w-40 md:h-40 text-6xl md:text-7xl',
  };

  const getIcon = (m: Move | null) => {
    switch (m) {
      case Move.ROCK: return '🪨';
      case Move.PAPER: return '📄';
      case Move.SCISSORS: return '✂️';
      default: return '🎰';
    }
  };

  const getStyles = (m: Move | null) => {
    if (!isRevealed) return 'bg-slate-800 border-slate-700 text-slate-600';
    switch (m) {
      case Move.ROCK: 
        return 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-400 shadow-[0_0_15px_rgba(148,163,184,0.4)] text-orange-100';
      case Move.PAPER: 
        return 'bg-gradient-to-br from-cyan-600 to-blue-900 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] text-white';
      case Move.SCISSORS: 
        return 'bg-gradient-to-br from-pink-600 to-rose-900 border-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.4)] text-white';
      default: 
        return 'bg-slate-900 border-slate-800 text-slate-700';
    }
  };

  return (
    <div className={`
      ${sizeClasses[size]} 
      ${getStyles(move)}
      rounded-2xl border-2 flex items-center justify-center 
      transition-all duration-300 select-none transform hover:scale-105
      ${className}
    `}>
      <div className="drop-shadow-lg filter">
        {getIcon(move)}
      </div>
      
      {/* Shine effect */}
      {isRevealed && move && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/10 to-transparent opacity-50 pointer-events-none"></div>
      )}
    </div>
  );
};
