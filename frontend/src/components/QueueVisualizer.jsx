import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, StepBack, StepForward, 
  Cpu, ArrowDown, ArrowUp, CheckCircle2, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

export function QueueVisualizer({ trace = [], processes = [], algorithm = 'FCFS', simulationResult = null }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const maxTime = trace.length > 0 ? trace[trace.length - 1].endTime : 0;

  const isMultiQueue = algorithm === 'MLQ' || algorithm === 'MLFQ';

  useEffect(() => {
    if (!isPlaying) return;
    const tickDurationMs = 500 / speedMultiplier;
    const intervalTime = Math.max(50, tickDurationMs);
    const step = Math.max(1, Math.round(intervalTime / tickDurationMs));

    const interval = setInterval(() => {
      setCurrentTime((t) => {
        if (t >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        const next = t + step;
        if (next >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, maxTime, speedMultiplier]);

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
          if (isMultiQueue) {
            if (algorithm === 'MLQ') {
              const qIdx = stat.priority <= 1 ? 0 : stat.priority === 2 ? 1 : 2;
              waitingQueues[qIdx].push({ id: p.id, remainingTime: stat.remainingTime, priority: stat.priority });
            } else {
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

  // Strict monochrome metadata definitions matching the dark aesthetic
  const queueMeta = isMultiQueue ? [
    { 
      name: 'Queue 0 (Q₀)', 
      priorityLabel: 'High Priority', 
      quantumLabel: 'RR q=2', 
      border: 'border-zinc-700 bg-zinc-900/90', 
      chipBg: 'bg-zinc-800 text-white border-zinc-700',
      badgeBg: 'bg-zinc-800 text-white border-zinc-700'
    },
    { 
      name: 'Queue 1 (Q₁)', 
      priorityLabel: 'Medium Priority', 
      quantumLabel: 'RR q=4', 
      border: 'border-zinc-800 bg-zinc-900/50', 
      chipBg: 'bg-zinc-850 text-zinc-300 border-zinc-750',
      badgeBg: 'bg-zinc-900 text-zinc-300 border-zinc-800'
    },
    { 
      name: 'Queue 2 (Q₂)', 
      priorityLabel: 'Low Priority / Batch', 
      quantumLabel: algorithm === 'MLQ' ? 'FCFS' : 'RR q=8', 
      border: 'border-zinc-800/80 bg-zinc-950/70', 
      chipBg: 'bg-zinc-900 text-zinc-400 border-zinc-800',
      badgeBg: 'bg-zinc-950 text-zinc-400 border-zinc-850'
    }
  ] : [
    { 
      name: 'Ready Queue', 
      priorityLabel: 'Standard FIFO Ready Track', 
      quantumLabel: algorithm === 'RR' ? `RR q=${simulationResult?.config?.timeQuantum || 2}` : algorithm, 
      border: 'border-zinc-700 bg-zinc-900/90', 
      chipBg: 'bg-zinc-800 text-white border-zinc-700',
      badgeBg: 'bg-zinc-800 text-white border-zinc-700'
    }
  ];

  return (
    <div className="flex flex-col h-full justify-between select-none gap-3">
      
      <div className="flex flex-col gap-2.5">
        {/* Top Status & Activity Strip */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs">
          <div className="flex items-center gap-2 truncate">
            <Activity className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="font-medium text-zinc-300 truncate text-[11px]">
              {activeEvent}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
              {isMultiQueue ? `${algorithm} Engine` : `${algorithm} Unilevel`}
            </span>
          </div>
        </div>

        {/* Upper Split: Queues Lane (Left) + CPU Execution Core (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 shrink-0">
          
          {/* Left Area: Multi-Level Queue Tracks */}
          <div className={`${isMultiQueue ? 'md:col-span-8' : 'md:col-span-7'} flex flex-col gap-2 justify-start`}>
            {queueMeta.map((meta, qIdx) => {
              const queueItems = queuesData[qIdx] || [];
              const isCpuSource = activeCpu && activeCpu.queue === qIdx;

              return (
                <div key={meta.name} className="flex flex-col gap-1">
                  {/* Queue Row Box - Locked height to prevent content jumping */}
                  <div 
                    className={`${isMultiQueue ? 'h-[62px]' : 'h-[110px]'} p-1.5 rounded-lg border transition-colors flex flex-col justify-between shrink-0 ${
                      isCpuSource 
                        ? 'border-zinc-600 bg-zinc-900/90 shadow-[0_0_10px_rgba(255,255,255,0.03)]' 
                        : `${meta.border}`
                    }`}
                  >
                    <div className="h-[18px] flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-white tracking-wide">{meta.name}</span>
                        <span className="text-[8.5px] font-semibold px-1 py-0.2 rounded border bg-zinc-800 text-zinc-300 border-zinc-700">
                          {meta.quantumLabel}
                        </span>
                        <span className="text-[9.5px] text-zinc-500 font-medium hidden sm:inline">
                          ({meta.priorityLabel})
                        </span>
                      </div>
                      
                      <span className="text-[9.5px] font-semibold text-zinc-500 tabular-nums">
                        {queueItems.length} {queueItems.length === 1 ? 'proc' : 'procs'}
                      </span>
                    </div>

                    {/* Horizontal Process Chips Track - Fixed height with hidden scrollbar */}
                    <div className={`${isMultiQueue ? 'h-[32px]' : 'h-[72px]'} flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1.5 rounded bg-black/60 border border-zinc-900 shrink-0`}>
                      {queueItems.length > 0 ? (
                        queueItems.map((proc) => (
                          <div
                            key={proc.id}
                            className={`h-[22px] flex items-center gap-1 px-2 rounded text-[10px] font-medium border shadow-sm shrink-0 select-none whitespace-nowrap ${meta.chipBg}`}
                          >
                            <span className="font-bold">{proc.id}</span>
                            <span className="text-[9px] opacity-75 tabular-nums">rem:{proc.remainingTime}ms</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[9.5px] text-zinc-600 italic px-1">
                          Queue Empty
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inter-Queue Demotion / Promotion notes (for MLFQ) */}
                  {isMultiQueue && algorithm === 'MLFQ' && qIdx < 2 && (
                    <div className="h-[14px] flex items-center justify-between px-1.5 text-[9px] text-zinc-500 shrink-0">
                      <div className="flex items-center gap-1">
                        <ArrowDown className="w-2.5 h-2.5 text-zinc-600" />
                        <span>Timeout &rarr; Demoted to Q{qIdx + 1}</span>
                      </div>
                      {qIdx === 0 && (
                        <div className="flex items-center gap-1 text-zinc-400">
                          <ArrowUp className="w-2.5 h-2.5 text-zinc-400" />
                          <span>Aging &ge; 10ms &rarr; Promoted</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Static rule note for MLQ */}
                  {isMultiQueue && algorithm === 'MLQ' && qIdx === 0 && (
                    <div className="h-[14px] flex items-center gap-1 px-1.5 text-[9px] text-zinc-500 shrink-0">
                      <span>• Static Partition: processes remain in assigned priority queues</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Area: CPU Execution Core - Locked dimensions to prevent resizing */}
          <div className={`${isMultiQueue ? 'md:col-span-4' : 'md:col-span-5'} flex flex-col justify-start`}>
            <div className="w-full h-full min-h-[190px] flex flex-col justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950/80 relative shadow-xl">
              
              <div className="h-[20px] w-full flex items-center justify-between pb-1.5 mb-1 border-b border-zinc-900 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${activeCpu ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">CPU Core 0</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded border ${activeCpu ? 'bg-zinc-900 border-zinc-800 text-zinc-300 font-semibold' : 'bg-zinc-950 border-zinc-900 text-zinc-600'}`}>
                  {activeCpu ? 'Active' : 'Idle'}
                </span>
              </div>

              {/* Center CPU Content - Perfectly symmetrical between Active & Idle */}
              <div className="flex-1 flex flex-col items-center justify-center my-auto py-1">
                <div className="h-[14px] text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1 flex items-center justify-center shrink-0">
                  {activeCpu ? 'Currently Executing' : 'System Idle'}
                </div>
                
                <div 
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-lg my-1 shrink-0 ${
                    activeCpu ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/60'
                  }`}
                >
                  {activeCpu ? (
                    <span className="text-xl font-black text-white">{activeCpu.id}</span>
                  ) : (
                    <Cpu className="w-5 h-5 text-zinc-600" />
                  )}
                </div>

                <div className="h-[34px] mt-1 flex flex-col items-center justify-center gap-0.5 shrink-0 text-center">
                  {activeCpu ? (
                    <>
                      <span className="text-xs font-semibold text-zinc-200 tabular-nums leading-tight">
                        {activeCpu.remainingTime} ms remaining
                      </span>
                      {isMultiQueue ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 mt-0.5 leading-none">
                          Dispatched from Q{activeCpu.queue}
                        </span>
                      ) : (
                        <span className="text-[9px] text-zinc-500 leading-none">
                          Unilevel CPU Dispatch
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-zinc-500 leading-tight">
                        Waiting for process
                      </span>
                      <span className="text-[9px] text-zinc-600 mt-0.5 leading-none">
                        Processor Standby
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Completed Processes Tray - Fixed locked height */}
        <div className="h-[40px] shrink-0 flex items-center gap-2 p-1.5 px-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0 text-zinc-400 text-[10px] font-semibold pr-2 border-r border-zinc-800 h-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Terminated ({completedList.length})</span>
          </div>

          <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar h-full py-0.5">
            {completedList.length > 0 ? (
              completedList.map(pId => (
                <span 
                  key={pId} 
                  className="h-[22px] flex items-center px-2 rounded text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 shrink-0"
                >
                  ✓ {pId}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-zinc-600 italic px-1">No processes finished yet</span>
            )}
          </div>
        </div>

      </div>

      {/* Scrubbing & Playback Controller */}
      <div className="shrink-0 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">T = 0 ms</span>
          <span className="bg-zinc-800 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border border-zinc-700 shadow-sm">
            TIME = {currentTime} ms
          </span>
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">T = {maxTime} ms</span>
        </div>
        
        <input 
          type="range" 
          min="0" max={maxTime} 
          value={currentTime}
          onChange={(e) => { setCurrentTime(parseInt(e.target.value)); setIsPlaying(false); }}
          className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white mb-2.5 border border-zinc-700/50"
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
