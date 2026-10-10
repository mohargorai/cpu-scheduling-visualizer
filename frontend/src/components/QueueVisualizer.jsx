import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function QueueVisualizer({ trace, processes }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const maxTime = trace.length > 0 ? Math.max(...trace.map(t => t.endTime)) : 0;

  useEffect(() => {
    let interval;
    if (isPlaying && currentTime < maxTime) {
      interval = setInterval(() => {
        setCurrentTime(t => Math.min(t + 1, maxTime));
      }, 500);
    } else if (currentTime >= maxTime) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, maxTime]);

  const activeProcessAtTime = trace.find(t => t.startTime <= currentTime && t.endTime > currentTime);

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      <div className="flex-1 flex items-center justify-center min-h-0">
        <AnimatePresence mode="wait">
          {activeProcessAtTime && activeProcessAtTime.processId !== 'IDLE' ? (
            <motion.div 
              key={activeProcessAtTime.processId}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="text-center"
            >
              <div className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Currently Executing</div>
              <div className="w-16 h-16 rounded-full border border-zinc-700 flex items-center justify-center bg-zinc-900 mx-auto shadow-xl">
                <span className="text-xl font-bold text-white">{activeProcessAtTime.processId}</span>
              </div>
              {activeProcessAtTime.queue !== undefined && (
                <motion.div 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mt-3 inline-block bg-zinc-800 border border-zinc-700 px-3 py-1 rounded text-[10px] font-medium text-zinc-300"
                >
                  Queue {activeProcessAtTime.queue}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="idle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center mx-auto"
            >
              <div className="text-[9px] uppercase tracking-widest font-bold text-zinc-600 mb-2">System Idle</div>
              <div className="w-16 h-16 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-950 mx-auto shadow-inner">
                <Cpu className="w-6 h-6 text-zinc-700" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
        
        <div className="flex items-center justify-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentTime(0)} 
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Reset to Start"
          >
            <SkipBack className="w-3.5 h-3.5" />
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
            onClick={() => setCurrentTime(maxTime)} 
            className="text-zinc-500 hover:text-white p-1.5 rounded hover:bg-zinc-800 transition-colors"
            title="Skip to End"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
