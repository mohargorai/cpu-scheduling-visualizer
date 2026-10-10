import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, StepBack, StepForward } from 'lucide-react';
import { motion } from 'framer-motion';

export function QueueVisualizer({ trace, processes }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const maxTime = trace.length > 0 ? trace[trace.length - 1].endTime : 0;

  useEffect(() => {
    let interval;
    if (isPlaying && currentTime < maxTime) {
      // Original base speed: 1 tick every 500ms
      const tickDurationMs = 500 / speedMultiplier;
      
      // Cap browser re-renders at ~20fps (50ms interval) to prevent UI thread lag.
      // If we need to go faster than 50ms per tick, we increase the step size instead.
      const intervalTime = Math.max(50, tickDurationMs);
      const step = Math.max(1, Math.round(intervalTime / tickDurationMs));

      interval = setInterval(() => {
        setCurrentTime(t => Math.min(t + step, maxTime));
      }, intervalTime);
    } else if (currentTime >= maxTime) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, maxTime, speedMultiplier]);

  // O(log N) Binary search for ultra-fast scrubbing on massive datasets
  const getActiveProcess = () => {
    if (!trace || trace.length === 0) return null;
    let left = 0;
    let right = trace.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const t = trace[mid];
      if (currentTime >= t.startTime && currentTime < t.endTime) return t;
      if (currentTime < t.startTime) right = mid - 1;
      else left = mid + 1;
    }
    if (currentTime >= maxTime && trace.length > 0) return trace[trace.length - 1];
    return null;
  };
  
  const activeProcessAtTime = getActiveProcess();

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      <div className="flex-1 flex items-center justify-center min-h-0">
        {activeProcessAtTime && activeProcessAtTime.processId !== 'IDLE' ? (
          <div className="text-center transition-all">
            <div className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Currently Executing</div>
            <div className="w-16 h-16 rounded-full border border-zinc-700 flex items-center justify-center bg-zinc-900 mx-auto shadow-xl">
              <motion.span 
                key={activeProcessAtTime.processId}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-xl font-bold text-white"
              >
                {activeProcessAtTime.processId}
              </motion.span>
            </div>
            {activeProcessAtTime.queue !== undefined && (
              <div className="mt-3 inline-block bg-zinc-800 border border-zinc-700 px-3 py-1 rounded text-[10px] font-medium text-zinc-300">
                Queue {activeProcessAtTime.queue}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center mx-auto transition-all">
            <div className="text-[9px] uppercase tracking-widest font-bold text-zinc-600 mb-2">System Idle</div>
            <div className="w-16 h-16 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-950 mx-auto shadow-inner">
              <Cpu className="w-6 h-6 text-zinc-700" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-none bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">T = 0</span>
          <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border border-zinc-700 transition-colors">
            TIME = {currentTime} ms
          </span>
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">T = {maxTime}</span>
        </div>
        <input 
          type="range" 
          min="0" max={maxTime} 
          value={currentTime}
          onChange={(e) => { setCurrentTime(parseInt(e.target.value)); setIsPlaying(false); }}
          className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white mb-3 border border-zinc-700/50"
        />
        
        <div className="flex items-center justify-center gap-3 relative">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCurrentTime(0); setIsPlaying(false); }} 
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Reset to Start"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCurrentTime(Math.max(0, currentTime - 1)); setIsPlaying(false); }} 
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Step Backward (1 ms)"
          >
            <StepBack className="w-3.5 h-3.5" />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPlaying(!isPlaying)} 
            className="bg-white hover:bg-zinc-200 text-black p-2 rounded-full shadow-lg"
            title={isPlaying ? "Pause Simulation" : "Play Simulation"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current translate-x-[1px]" />}
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCurrentTime(Math.min(maxTime, currentTime + 1)); setIsPlaying(false); }} 
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Step Forward (1 ms)"
          >
            <StepForward className="w-3.5 h-3.5" />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCurrentTime(maxTime); setIsPlaying(false); }} 
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Skip to End"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const opts = [0.5, 1, 2, 5, 10, 50, 100, 500];
              setSpeedMultiplier(s => opts[(opts.indexOf(s) + 1) % opts.length]);
            }}
            className="absolute right-0 text-[10px] font-bold text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-700 hover:text-white hover:bg-zinc-800 transition-colors shadow-inner min-w-[38px]"
            title="Toggle Playback Speed"
          >
            {speedMultiplier}x
          </motion.button>
        </div>
      </div>
    </div>
  );
}
