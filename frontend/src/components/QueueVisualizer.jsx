import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, StepBack, StepForward, 
  Cpu, ArrowDown, ArrowUp, CheckCircle2, Activity, ScrollText, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProcessColor } from './GanttChart';
import { useStore } from '../store';

export function QueueVisualizer({ trace = [], processes = [], algorithm = 'FCFS', simulationResult = null }) {
  const { seekTime } = useStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [showDecisionLog, setShowDecisionLog] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const maxTime = trace.length > 0 ? trace[trace.length - 1].endTime : 0;

  const isMultiQueue = algorithm === 'MLQ' || algorithm === 'MLFQ';

  // React to seekTime changes from GanttChart bar clicks
  useEffect(() => {
    if (seekTime !== null && seekTime !== undefined) {
      setCurrentTime(seekTime);
      setIsPlaying(false);
    }
  }, [seekTime]);

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

  // Global Keyboard Shortcuts for Playback
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTime(t => Math.min(maxTime, t + 1));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTime(t => Math.max(0, t - 1));
      } else if (e.code === 'Home') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTime(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTime(maxTime);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maxTime]);

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
    // 1. If backend provided queueSnapshots, check for matching timestamp within covered range
    if (simulationResult?.queueSnapshots && simulationResult.queueSnapshots.length > 0) {
      const lastSnap = simulationResult.queueSnapshots[simulationResult.queueSnapshots.length - 1];
      if (currentTime <= lastSnap.time) {
        // Fast binary search
        let left = 0;
        let right = simulationResult.queueSnapshots.length - 1;
        let closest = simulationResult.queueSnapshots[0];
        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          const s = simulationResult.queueSnapshots[mid];
          if (s.time === currentTime) return s;
          if (s.time < currentTime) {
            closest = s;
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        }
        return closest;
      }
      // If currentTime exceeds backend snapshots (e.g. large workloads), fall through to deterministic client reconstructor
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

    // Accumulate execution from trace (trace is chronological, so break early when startTime >= currentTime)
    for (const t of trace) {
      if (t.processId === 'IDLE') continue;
      if (t.startTime >= currentTime) break;
      const executedInSlice = Math.min(currentTime, t.endTime) - t.startTime;
      if (procStats[t.processId]) {
        procStats[t.processId].executedTime += executedInSlice;
        procStats[t.processId].remainingTime = Math.max(0, procStats[t.processId].burstTime - procStats[t.processId].executedTime);
        if (t.queue !== undefined) {
          procStats[t.processId].lastQueue = t.queue;
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

  // Clean monochrome metadata with subtle queue badges
  const queueMeta = isMultiQueue ? [
    { 
      name: 'Queue 0 (Q₀)', 
      nameColor: 'text-white',
      priorityLabel: 'High Priority', 
      quantumLabel: 'RR q=2', 
      border: 'border-zinc-800 bg-zinc-900/50', 
      badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
    },
    { 
      name: 'Queue 1 (Q₁)', 
      nameColor: 'text-white',
      priorityLabel: 'Medium Priority', 
      quantumLabel: 'RR q=4', 
      border: 'border-zinc-800 bg-zinc-900/50', 
      badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    { 
      name: 'Queue 2 (Q₂)', 
      nameColor: 'text-white',
      priorityLabel: 'Low Priority / Batch', 
      quantumLabel: algorithm === 'MLQ' ? 'FCFS' : 'RR q=8', 
      border: 'border-zinc-800 bg-zinc-900/50', 
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
  ] : [
    { 
      name: 'Ready Queue', 
      nameColor: 'text-white',
      priorityLabel: 'Standard FIFO Ready Track', 
      quantumLabel: algorithm === 'RR' ? `RR q=${simulationResult?.config?.timeQuantum || 2}` : algorithm, 
      border: 'border-zinc-800 bg-zinc-900/50', 
      badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
    }
  ];

  // Extract chronological Dispatcher Decision Logs from simulation events
  const decisionLogs = useMemo(() => {
    if (!simulationResult || !simulationResult.trace || simulationResult.trace.length === 0) return [];
    const logs = [];

    if (simulationResult.queueSnapshots && simulationResult.queueSnapshots.length > 0) {
      let lastEvent = '';
      for (const snap of simulationResult.queueSnapshots) {
        if (snap.event && snap.event !== lastEvent) {
          let type = 'dispatch';
          const lower = snap.event.toLowerCase();
          if (lower.includes('idle')) type = 'idle';
          else if (lower.includes('demot')) type = 'demotion';
          else if (lower.includes('aging') || lower.includes('promot')) type = 'aging';
          else if (lower.includes('preempt')) type = 'preemption';
          else if (lower.includes('completed') || lower.includes('finish') || lower.includes('terminat')) type = 'completion';

          logs.push({
            time: snap.time,
            event: snap.event,
            type
          });
          lastEvent = snap.event;
        }
      }
      if (logs.length > 0) return logs;
    }

    // Fallback: construct from trace
    for (let i = 0; i < simulationResult.trace.length; i++) {
      const t = simulationResult.trace[i];
      if (t.processId === 'IDLE') {
        logs.push({
          time: t.startTime,
          event: `Ready queue empty → CPU is IDLE (${t.endTime - t.startTime}ms)`,
          type: 'idle'
        });
      } else {
        const isFirst = i === 0 || simulationResult.trace[i - 1].processId !== t.processId;
        if (isFirst) {
          const qText = t.queue !== undefined ? ` from Queue ${t.queue}` : '';
          logs.push({
            time: t.startTime,
            event: `Dispatched ${t.processId}${qText} (${t.endTime - t.startTime}ms slice)`,
            type: 'dispatch'
          });
        }
      }
    }

    if (simulationResult.metrics) {
      for (const m of simulationResult.metrics) {
        if (m.completionTime !== undefined) {
          logs.push({
            time: m.completionTime,
            event: `Process ${m.id} completed execution → Terminated`,
            type: 'completion'
          });
        }
      }
    }

    logs.sort((a, b) => a.time - b.time);
    return logs;
  }, [simulationResult]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return decisionLogs;
    return decisionLogs.filter(l => l.type === logFilter);
  }, [decisionLogs, logFilter]);

  return (
    <div className="flex flex-col h-full justify-between select-none gap-3 relative">
      
      <div className="flex flex-col gap-2.5">
        {/* Top Status & Activity Strip */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs">
          <div className="flex items-center gap-2 truncate">
            <Activity className={`w-3.5 h-3.5 shrink-0 ${activeCpu ? 'text-sky-400' : 'text-zinc-500'}`} />
            <span className="font-medium text-zinc-300 truncate text-[11px]">
              {activeEvent}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {decisionLogs.length > 0 && (
              <button
                onClick={() => setShowDecisionLog(v => !v)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all flex items-center gap-1 ${
                  showDecisionLog 
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' 
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-700'
                }`}
                title="Toggle Live Dispatcher Decision Log"
              >
                <ScrollText className="w-3 h-3 text-sky-400" />
                <span>Log ({decisionLogs.length})</span>
              </button>
            )}
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
                        ? 'border-zinc-600 bg-zinc-900 shadow-sm' 
                        : `${meta.border}`
                    }`}
                  >
                    <div className="h-[18px] flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold tracking-wide ${meta.nameColor || 'text-white'}`}>{meta.name}</span>
                        <span className={`text-[8.5px] font-semibold px-1.5 py-0.2 rounded border ${meta.badgeBg}`}>
                          {meta.quantumLabel}
                        </span>
                        <span className="text-[9.5px] text-zinc-400 font-medium hidden sm:inline">
                          ({meta.priorityLabel})
                        </span>
                      </div>
                      
                      <span className="text-[9.5px] font-semibold text-zinc-400 tabular-nums">
                        {queueItems.length} {queueItems.length === 1 ? 'proc' : 'procs'}
                      </span>
                    </div>

                    {/* Horizontal Process Chips Track - Fixed height with hidden scrollbar */}
                    <div className={`${isMultiQueue ? 'h-[32px]' : 'h-[72px]'} flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1.5 rounded bg-black/60 border border-zinc-900 shrink-0`}>
                      {queueItems.length > 0 ? (
                        <>
                          {queueItems.slice(0, 50).map((proc) => {
                            return (
                              <div
                                key={proc.id}
                                className="h-[22px] flex items-center gap-1.5 px-2 rounded text-[10px] font-medium border border-zinc-800 bg-zinc-900 text-zinc-200 shadow-xs shrink-0 select-none whitespace-nowrap"
                              >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getProcessColor(proc.id) }} />
                                <span className="font-bold text-white">{proc.id}</span>
                                <span className="text-[9px] text-zinc-400 tabular-nums">rem:{proc.remainingTime}ms</span>
                              </div>
                            );
                          })}
                          {queueItems.length > 50 && (
                            <span className="text-[9.5px] font-semibold text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 shrink-0 select-none">
                              +{queueItems.length - 50} more
                            </span>
                          )}
                        </>
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
                        <ArrowDown className="w-2.5 h-2.5 text-amber-400" />
                        <span className="text-zinc-400">Timeout &rarr; Demoted to Q{qIdx + 1}</span>
                      </div>
                      {qIdx === 0 && (
                        <div className="flex items-center gap-1 text-emerald-400">
                          <ArrowUp className="w-2.5 h-2.5 text-emerald-400" />
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
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${activeCpu ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 whitespace-nowrap">CPU Core 0</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${
                  activeCpu 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                }`}>
                  {activeCpu ? 'Active' : 'Idle'}
                </span>
              </div>

              {/* Center CPU Content - Perfectly symmetrical between Active & Idle */}
              <div className="flex-1 flex flex-col items-center justify-center my-auto py-1">
                <div className="h-[14px] text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1 flex items-center justify-center shrink-0">
                  {activeCpu ? 'Currently Executing' : 'System Idle'}
                </div>
                
                <div 
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-lg my-1 shrink-0 transition-colors ${
                    activeCpu ? 'bg-zinc-900' : 'border-zinc-800 bg-zinc-900/60'
                  }`}
                  style={activeCpu ? { borderColor: getProcessColor(activeCpu.id) } : {}}
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
          <div className="flex items-center gap-1.5 shrink-0 text-emerald-400 text-[10px] font-semibold pr-2 border-r border-zinc-800 h-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Terminated ({completedList.length})</span>
          </div>

          <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar h-full py-0.5">
            {completedList.length > 0 ? (
              <>
                {completedList.length > 40 && (
                  <span className="text-[9.5px] font-semibold text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded shrink-0 select-none">
                    +{completedList.length - 40} earlier
                  </span>
                )}
                {completedList.slice(-40).map(pId => (
                  <span 
                    key={pId} 
                    className="h-[22px] flex items-center px-2 rounded text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 shrink-0"
                  >
                    ✓ {pId}
                  </span>
                ))}
              </>
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
          <span className="bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border border-sky-500/20 shadow-sm">
            TIME = {currentTime} ms
          </span>
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">T = {maxTime} ms</span>
        </div>
        
        <input 
          type="range" 
          min="0" max={maxTime} 
          value={currentTime}
          onChange={(e) => { setCurrentTime(parseInt(e.target.value)); setIsPlaying(false); }}
          className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-sky-400 mb-2.5 border border-zinc-700/50"
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

        {/* Keyboard shortcut hint */}
        <div className="text-[9px] text-zinc-500 text-center mt-2 flex flex-wrap items-center justify-center gap-2">
          <span><kbd className="px-1 py-0.2 bg-zinc-950 border border-zinc-800 rounded text-zinc-400 font-mono">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1 py-0.2 bg-zinc-950 border border-zinc-800 rounded text-zinc-400 font-mono">← / →</kbd> Step 1ms</span>
          <span><kbd className="px-1 py-0.2 bg-zinc-950 border border-zinc-800 rounded text-zinc-400 font-mono">Home/End</kbd> Bounds</span>
          <span><kbd className="px-1 py-0.2 bg-zinc-950 border border-zinc-800 rounded text-zinc-400 font-mono">R</kbd> Reset</span>
        </div>
      </div>

      {/* Dispatcher Decision Log Drawer */}
      <AnimatePresence>
        {showDecisionLog && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-x-0 bottom-[95px] top-[40px] z-20 bg-zinc-950/95 border border-zinc-800 rounded-xl p-3 backdrop-blur-md shadow-2xl flex flex-col gap-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-white">Dispatcher Decision Log</h4>
                <span className="text-[10px] text-zinc-400 font-mono">({filteredLogs.length} events)</span>
              </div>
              <button 
                onClick={() => setShowDecisionLog(false)}
                className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 text-[10px] overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'demotion', label: 'Demotions' },
                { id: 'aging', label: 'Aging' },
                { id: 'preemption', label: 'Preemptions' },
                { id: 'idle', label: 'Idle' },
                { id: 'completion', label: 'Completed' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setLogFilter(f.id)}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors shrink-0 ${
                    logFilter === f.id ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Scrollable event list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar text-xs">
              {filteredLogs.map((log, idx) => {
                const isCurrent = Math.abs(currentTime - log.time) <= 1;
                return (
                  <div
                    key={idx}
                    onClick={() => { setCurrentTime(log.time); setIsPlaying(false); }}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isCurrent 
                        ? 'bg-zinc-900 border-sky-500/50 shadow-sm' 
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-mono font-bold text-sky-400 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                        T={log.time}ms
                      </span>
                      <span className={`text-[11px] truncate ${isCurrent ? 'text-white font-medium' : 'text-zinc-300'}`}>
                        {log.event}
                      </span>
                    </div>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                      log.type === 'aging' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      log.type === 'demotion' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      log.type === 'preemption' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      log.type === 'idle' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' :
                      log.type === 'completion' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    }`}>
                      {log.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
