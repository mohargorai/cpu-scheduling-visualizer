import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, StepBack, StepForward, 
  Cpu, ArrowDown, ArrowUp, CheckCircle2, Zap, Layers, Clock, ShieldAlert 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function QueueVisualizer({ trace = [], processes = [], algorithm = 'FCFS', simulationResult = null }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const maxTime = trace.length > 0 ? trace[trace.length - 1].endTime : 0;

  const isMultiQueue = algorithm === 'MLQ' || algorithm === 'MLFQ';

  useEffect(() => {
    let interval;
    if (isPlaying && currentTime < maxTime) {
      const tickDurationMs = 500 / speedMultiplier;
      const intervalTime = Math.max(50, tickDurationMs);
      const step = Math.max(1, Math.round(intervalTime / tickDurationMs));

      interval = setInterval(() => {
        setCurrentTime((t) => {
          const next = t + step;
          if (next >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return next;
        });
      }, intervalTime);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, maxTime, speedMultiplier]);

  // Reset time when algorithm or trace changes
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [algorithm, trace]);

  // Fast binary search for active trace item at currentTime
  const activeTrace = useMemo(() => {
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
  }, [trace, currentTime, maxTime]);

  // Compute or extract exact queue states at currentTime
  const currentSnapshot = useMemo(() => {
    // 1. If backend provided queueSnapshots, check for matching timestamp
    if (simulationResult?.queueSnapshots && simulationResult.queueSnapshots.length > 0) {
      const snap = simulationResult.queueSnapshots.find(s => s.time === currentTime);
      if (snap) return snap;
      // If exact time tick not found, pick the closest preceding snapshot
      let closest = simulationResult.queueSnapshots[0];
      for (const s of simulationResult.queueSnapshots) {
        if (s.time <= currentTime) closest = s;
        else break;
      }
      return closest;
    }

    // 2. High-precision deterministic client reconstructor
    // Calculate remaining bursts and completed state up to currentTime
    const procStats = {};
    for (const p of processes) {
      procStats[p.id] = {
        id: p.id,
        burstTime: p.burstTime,
        arrivalTime: p.arrivalTime,
        priority: p.priority,
        executedTime: 0,
        remainingTime: p.burstTime,
        lastQueue: 0
      };
    }

    // Accumulate execution from trace
    for (const t of trace) {
      if (t.processId === 'IDLE') continue;
      if (t.startTime < currentTime) {
        const executedInSlice = Math.min(currentTime, t.endTime) - t.startTime;
        if (procStats[t.processId]) {
          procStats[t.processId].executedTime += executedInSlice;
          procStats[t.processId].remainingTime = Math.max(0, procStats[t.processId].burstTime - procStats[t.processId].executedTime);
          if (t.queue !== undefined) {
            procStats[t.processId].lastQueue = t.queue;
          }
        }
      }
    }

    const cpuProc = activeTrace && activeTrace.processId !== 'IDLE' ? {
      id: activeTrace.processId,
      queue: activeTrace.queue ?? 0,
      remainingTime: procStats[activeTrace.processId]?.remainingTime ?? 0,
      priority: procStats[activeTrace.processId]?.priority ?? 1
    } : null;

    const completed = [];
    const waitingQueues = isMultiQueue ? [[], [], []] : [[]];

    for (const p of processes) {
      const stat = procStats[p.id];
      if (stat.arrivalTime <= currentTime) {
        if (stat.remainingTime === 0) {
          completed.push(p.id);
        } else if (!cpuProc || cpuProc.id !== p.id) {
          // Waiting in queue
          if (isMultiQueue) {
            if (algorithm === 'MLQ') {
              // Static priority partition
              const qIdx = stat.priority <= 1 ? 0 : stat.priority === 2 ? 1 : 2;
              waitingQueues[qIdx].push({ id: p.id, remainingTime: stat.remainingTime, priority: stat.priority });
            } else {
              // MLFQ: use last known queue
              const qIdx = Math.min(2, Math.max(0, stat.lastQueue || 0));
              waitingQueues[qIdx].push({ id: p.id, remainingTime: stat.remainingTime, priority: stat.priority });
            }
          } else {
            waitingQueues[0].push({ id: p.id, remainingTime: stat.remainingTime, priority: stat.priority });
          }
        }
      }
    }

    let eventMsg = 'System Idle';
    if (cpuProc) {
      eventMsg = isMultiQueue 
        ? `${cpuProc.id} executing in Queue ${cpuProc.queue} (${cpuProc.remainingTime}ms remaining)`
        : `${cpuProc.id} executing on CPU (${cpuProc.remainingTime}ms remaining)`;
    } else if (currentTime >= maxTime && maxTime > 0) {
      eventMsg = 'All processes completed execution';
    }

    return {
      time: currentTime,
      cpu: cpuProc,
      queues: waitingQueues,
      completed,
      event: eventMsg
    };
  }, [currentTime, trace, processes, algorithm, simulationResult, activeTrace, isMultiQueue, maxTime]);

  const queuesData = currentSnapshot?.queues || (isMultiQueue ? [[], [], []] : [[]]);
  const activeCpu = currentSnapshot?.cpu;
  const completedList = currentSnapshot?.completed || [];
  const activeEvent = currentSnapshot?.event || 'Ready to simulate';

  // Queue metadata definitions
  const queueMeta = isMultiQueue ? [
    { 
      name: 'Queue 0 (Q₀)', 
      priorityLabel: 'High Priority', 
      quantumLabel: 'RR q=2', 
      color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400', 
      chipBg: 'bg-emerald-950/80 border-emerald-700/60 text-emerald-200',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    { 
      name: 'Queue 1 (Q₁)', 
      priorityLabel: 'Medium Priority', 
      quantumLabel: 'RR q=4', 
      color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400', 
      chipBg: 'bg-cyan-950/80 border-cyan-700/60 text-cyan-200',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    { 
      name: 'Queue 2 (Q₂)', 
      priorityLabel: 'Low Priority / Batch', 
      quantumLabel: algorithm === 'MLQ' ? 'FCFS' : 'RR q=8', 
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-400', 
      chipBg: 'bg-amber-950/80 border-amber-700/60 text-amber-200',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    }
  ] : [
    { 
      name: 'Ready Queue', 
      priorityLabel: 'Standard Scheduling', 
      quantumLabel: algorithm === 'RR' ? `RR q=${simulationResult?.config?.timeQuantum || 2}` : algorithm, 
      color: 'border-blue-500/40 bg-blue-500/10 text-blue-400', 
      chipBg: 'bg-blue-950/80 border-blue-700/60 text-blue-200',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    }
  ];

  return (
    <div className="flex flex-col h-full justify-between gap-3 min-h-0 select-none">
      
      {/* Top Status & Activity Strip */}
      <div className="flex-none flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900/70 border border-zinc-800/80 rounded-lg text-xs">
        <div className="flex items-center gap-2 truncate">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-semibold text-zinc-300 truncate">
            {activeEvent}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Mode</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {isMultiQueue ? `${algorithm} Engine` : `${algorithm} Unilevel`}
          </span>
        </div>
      </div>

      {/* Main Visual Arena: Queues & CPU */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-3 py-1">
        
        {/* Upper Visualizer Split: Multi-Queue Lanes + CPU Core */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0">
          
          {/* Left/Center Area: Queue Tracks */}
          <div className={`${isMultiQueue ? 'md:col-span-8' : 'md:col-span-7'} flex flex-col gap-2.5 justify-center`}>
            {queueMeta.map((meta, qIdx) => {
              const queueItems = queuesData[qIdx] || [];
              const isCpuSource = activeCpu && activeCpu.queue === qIdx;

              return (
                <div key={meta.name} className="flex flex-col gap-1">
                  {/* Queue Track Box */}
                  <div 
                    className={`p-2.5 rounded-lg border transition-all duration-200 ${
                      isCpuSource 
                        ? `${meta.color} shadow-[0_0_12px_rgba(255,255,255,0.05)]` 
                        : 'border-zinc-800/80 bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white tracking-wide">{meta.name}</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${meta.badgeBg}`}>
                          {meta.quantumLabel}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline">
                          ({meta.priorityLabel})
                        </span>
                      </div>
                      
                      <span className="text-[10px] font-bold text-zinc-500">
                        {queueItems.length} {queueItems.length === 1 ? 'proc' : 'procs'} waiting
                      </span>
                    </div>

                    {/* Queue Process Chips Lane */}
                    <div className="min-h-[36px] flex items-center gap-1.5 overflow-x-auto custom-scrollbar p-1 rounded bg-black/40 border border-zinc-900">
                      <AnimatePresence mode="popLayout">
                        {queueItems.length > 0 ? (
                          queueItems.map((proc) => (
                            <motion.div
                              key={proc.id}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border shadow-sm shrink-0 ${meta.chipBg}`}
                            >
                              <span className="font-bold text-white">{proc.id}</span>
                              <span className="text-[10px] opacity-75">rem:{proc.remainingTime}ms</span>
                            </motion.div>
                          ))
                        ) : (
                          <span className="text-[11px] text-zinc-600 italic px-2">
                            Queue Empty
                          </span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Inter-Queue Demotion / Promotion indicators (for MLFQ) */}
                  {isMultiQueue && algorithm === 'MLFQ' && qIdx < 2 && (
                    <div className="flex items-center justify-between px-3 text-[10px] text-zinc-500">
                      <div className="flex items-center gap-1 text-zinc-500">
                        <ArrowDown className="w-3 h-3 text-zinc-600" />
                        <span>Quantum timeout &rarr; Demoted to Q{qIdx + 1}</span>
                      </div>
                      {qIdx === 0 && (
                        <div className="flex items-center gap-1 text-emerald-500/80">
                          <ArrowUp className="w-3 h-3" />
                          <span>Aging &rarr; Promoted to Q₀</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Static rule note for MLQ */}
                  {isMultiQueue && algorithm === 'MLQ' && qIdx < 2 && (
                    <div className="flex items-center gap-1 px-3 text-[10px] text-zinc-600">
                      <span>• Static Queue Partition (No inter-queue migration)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Area: CPU Execution Core */}
          <div className={`${isMultiQueue ? 'md:col-span-4' : 'md:col-span-5'} flex flex-col justify-center items-center`}>
            <div className="w-full h-full min-h-[170px] flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 relative overflow-hidden shadow-xl">
              
              <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${activeCpu ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">CPU Core 0</span>
              </div>

              {activeCpu ? (
                <div className="flex flex-col items-center text-center my-auto transition-all">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">
                    Currently Executing
                  </div>
                  
                  <div className="relative my-1">
                    <motion.div 
                      key={activeCpu.id}
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="w-16 h-16 rounded-2xl border-2 border-white/20 bg-zinc-900 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                      <span className="text-2xl font-black text-white tracking-tight">{activeCpu.id}</span>
                    </motion.div>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-zinc-300">
                      {activeCpu.remainingTime} ms burst remaining
                    </span>
                    {isMultiQueue && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${queueMeta[activeCpu.queue]?.badgeBg || 'bg-zinc-800 text-zinc-300'}`}>
                        Dispatched from Q{activeCpu.queue}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center my-auto transition-all">
                  <div className="w-14 h-14 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center mb-2 shadow-inner">
                    <Cpu className="w-7 h-7 text-zinc-700" />
                  </div>
                  <div className="text-xs font-bold text-zinc-400">System Idle</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">Waiting for ready process</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lower Completed Processes Tray */}
        <div className="flex-none flex items-center gap-2 p-2 rounded-lg bg-zinc-900/40 border border-zinc-800/60 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0 text-zinc-400 text-[11px] font-semibold pr-2 border-r border-zinc-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Terminated ({completedList.length})</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            {completedList.length > 0 ? (
              completedList.map(pId => (
                <span 
                  key={pId} 
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/80 shrink-0"
                >
                  ✓ {pId}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-zinc-600 italic">No processes finished yet</span>
            )}
          </div>
        </div>

      </div>

      {/* Scrubbing & Playback Controller */}
      <div className="flex-none bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">T = 0 ms</span>
          <span className="bg-zinc-800 text-zinc-200 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider border border-zinc-700 transition-colors shadow-sm">
            TIME = {currentTime} ms
          </span>
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">T = {maxTime} ms</span>
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
            aria-label="Reset timeline to start"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCurrentTime(Math.max(0, currentTime - 1)); setIsPlaying(false); }} 
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Step Backward (1 ms)"
            aria-label="Step backward 1 millisecond"
          >
            <StepBack className="w-3.5 h-3.5" />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPlaying(!isPlaying)} 
            className="bg-white hover:bg-zinc-200 text-black p-2 rounded-full shadow-lg"
            title={isPlaying ? "Pause Simulation" : "Play Simulation"}
            aria-label={isPlaying ? "Pause playback" : "Play playback"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current translate-x-[1px]" />}
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCurrentTime(Math.min(maxTime, currentTime + 1)); setIsPlaying(false); }} 
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Step Forward (1 ms)"
            aria-label="Step forward 1 millisecond"
          >
            <StepForward className="w-3.5 h-3.5" />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCurrentTime(maxTime); setIsPlaying(false); }} 
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Skip to End"
            aria-label="Skip to end of timeline"
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
            aria-label="Toggle playback speed"
          >
            {speedMultiplier}x
          </motion.button>
        </div>
      </div>

    </div>
  );
}
