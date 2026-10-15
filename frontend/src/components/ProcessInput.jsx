import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store';
import { Plus, Trash2, Users, Activity, Upload, Settings, Cpu, Shuffle, Target, Sparkles, X, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProcessColor } from './GanttChart';

export const PRESETS = [
  {
    id: 'idle-gap',
    name: 'CPU Idle Gap Demo',
    badge: 'Proves Util < 100%',
    description: 'Staggered arrivals create idle gaps between jobs, proving CPU utilization drops below 100%.',
    algorithm: 'MLFQ',
    config: { timeQuantum: 2, quanta: [2, 4, 8], agingThreshold: 10 },
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 2, priority: 1 },
      { id: 'P2', arrivalTime: 8, burstTime: 4, priority: 1 },
      { id: 'P3', arrivalTime: 16, burstTime: 5, priority: 1 },
    ]
  },
  {
    id: 'convoy-effect',
    name: 'Convoy Effect Demo (FCFS)',
    badge: 'FCFS Delay',
    description: 'A 24ms CPU-burst job arrives first, holding the CPU and causing long wait times for small jobs.',
    algorithm: 'FCFS',
    config: {},
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 24, priority: 1 },
      { id: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
      { id: 'P3', arrivalTime: 2, burstTime: 3, priority: 1 },
      { id: 'P4', arrivalTime: 3, burstTime: 2, priority: 1 },
    ]
  },
  {
    id: 'mlfq-aging',
    name: 'MLFQ Demotion & Aging',
    badge: 'Dynamic Feedback',
    description: 'Long jobs demote through Q0→Q1→Q2, while the 10ms aging trigger promotes starving processes back to Q0.',
    algorithm: 'MLFQ',
    config: { timeQuantum: 2, quanta: [2, 4, 8], agingThreshold: 10 },
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 18, priority: 1 },
      { id: 'P2', arrivalTime: 0, burstTime: 2, priority: 1 },
      { id: 'P3', arrivalTime: 2, burstTime: 4, priority: 1 },
      { id: 'P4', arrivalTime: 6, burstTime: 16, priority: 1 },
    ]
  },
  {
    id: 'starvation-priority',
    name: 'Starvation Demo (Priority)',
    badge: 'Indefinite Delay',
    description: 'A continuous stream of incoming high-priority jobs completely starves low-priority process P1.',
    algorithm: 'Priority',
    config: {},
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 20, priority: 5 },
      { id: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
      { id: 'P3', arrivalTime: 3, burstTime: 3, priority: 1 },
      { id: 'P4', arrivalTime: 5, burstTime: 3, priority: 1 },
      { id: 'P5', arrivalTime: 7, burstTime: 2, priority: 2 },
    ]
  },
  {
    id: 'rr-fair-share',
    name: 'Round Robin Time-Sharing',
    badge: 'Interactive',
    description: 'Multiple concurrent interactive tasks execute in round-robin fashion, ensuring bounded response time.',
    algorithm: 'RR',
    config: { timeQuantum: 3 },
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 9, priority: 1 },
      { id: 'P2', arrivalTime: 1, burstTime: 7, priority: 1 },
      { id: 'P3', arrivalTime: 2, burstTime: 6, priority: 1 },
      { id: 'P4', arrivalTime: 3, burstTime: 5, priority: 1 },
    ]
  },
  {
    id: 'sjf-optimal',
    name: 'SJF Optimal Waiting Time',
    badge: 'Min Avg WT',
    description: 'Prioritizing jobs with smallest burst time demonstrates provably minimal average waiting time.',
    algorithm: 'SJF',
    config: {},
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 12, priority: 1 },
      { id: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
      { id: 'P3', arrivalTime: 2, burstTime: 2, priority: 1 },
      { id: 'P4', arrivalTime: 3, burstTime: 6, priority: 1 },
    ]
  }
];

export function ProcessInput() {
  const { processes, algorithm, config, setAlgorithm, setConfig, addProcess, removeProcess, setProcesses, updateProcess } = useStore();
  const [newProcess, setNewProcess] = useState({ arrivalTime: 0, burstTime: 5, priority: 1 });
  const [showPresets, setShowPresets] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { id, field, val }
  const fileInputRef = useRef(null);

  const handleSaveInline = () => {
    if (!editingCell) return;
    const num = Math.max(0, parseInt(editingCell.val) || 0);
    const finalVal = editingCell.field === 'burstTime' ? Math.max(1, num) : num;
    updateProcess(editingCell.id, { [editingCell.field]: finalVal });
    setEditingCell(null);
  };

  const loadPreset = (preset) => {
    setAlgorithm(preset.algorithm);
    if (preset.config) setConfig(preset.config);
    setProcesses(preset.processes);
    setShowPresets(false);
  };

  const generateRandomWorkload = () => {
    let procs = [];

    if (algorithm === 'MLQ') {
      // Tailored for MLQ: balanced partition across Q0 (Priority 1), Q1 (Priority 2), Q2 (Priority 3)
      const qDistribution = [
        { priority: 1, burstMin: 2, burstMax: 5 },
        { priority: 1, burstMin: 3, burstMax: 6 },
        { priority: 1, burstMin: 2, burstMax: 4 },
        { priority: 2, burstMin: 5, burstMax: 8 },
        { priority: 2, burstMin: 4, burstMax: 7 },
        { priority: 2, burstMin: 6, burstMax: 9 },
        { priority: 2, burstMin: 5, burstMax: 8 },
        { priority: 3, burstMin: 8, burstMax: 14 },
        { priority: 3, burstMin: 10, burstMax: 16 },
        { priority: 3, burstMin: 12, burstMax: 18 },
      ];
      procs = qDistribution.map((item, idx) => ({
        id: `P${idx + 1}`,
        arrivalTime: Math.floor(Math.random() * 10),
        burstTime: Math.floor(Math.random() * (item.burstMax - item.burstMin + 1)) + item.burstMin,
        priority: item.priority
      }));
    } else if (algorithm === 'MLFQ') {
      // Tailored for MLFQ: mix of short jobs (Q0), medium jobs (demote Q1), heavy jobs (demote Q2 + aging)
      const burstTiers = [2, 3, 4, 5, 6, 8, 10, 14, 18, 22];
      procs = burstTiers.map((burst, idx) => ({
        id: `P${idx + 1}`,
        arrivalTime: Math.floor(Math.random() * 8),
        burstTime: burst,
        priority: 1
      }));
    } else if (algorithm === 'RR') {
      // Tailored for RR: varied bursts spanning multiple quantum slices
      const q = config?.timeQuantum || 2;
      const bursts = [q, q + 1, q * 2, q * 2 + 1, q * 3, q * 4, q + 2, q * 2 - 1, q * 3 + 2, q * 5];
      procs = bursts.map((b, idx) => ({
        id: `P${idx + 1}`,
        arrivalTime: Math.floor(Math.random() * 8),
        burstTime: Math.max(1, b),
        priority: 1
      }));
    } else if (algorithm === 'Priority' || algorithm === 'PreemptivePriority') {
      // Tailored for Priority: varied priorities (P1-P5) arriving over time
      procs = Array.from({ length: 10 }, (_, idx) => ({
        id: `P${idx + 1}`,
        arrivalTime: Math.floor(Math.random() * 10),
        burstTime: Math.floor(Math.random() * 9) + 2,
        priority: (idx % 5) + 1
      }));
    } else if (algorithm === 'SJF' || algorithm === 'SRTF') {
      // Tailored for SJF/SRTF: contrast between short quick bursts and long background bursts
      const sjfBursts = [1, 2, 2, 3, 4, 6, 8, 12, 15, 18];
      procs = sjfBursts.map((b, idx) => ({
        id: `P${idx + 1}`,
        arrivalTime: Math.floor(Math.random() * 10),
        burstTime: b,
        priority: 1
      }));
    } else {
      // FCFS: staggered arrival showing convoy effect
      procs = Array.from({ length: 10 }, (_, idx) => ({
        id: `P${idx + 1}`,
        arrivalTime: idx * 2,
        burstTime: Math.floor(Math.random() * 10) + 2,
        priority: 1
      }));
    }

    procs.sort((a, b) => a.arrivalTime - b.arrivalTime);
    procs.forEach((p, idx) => {
      p.id = `P${idx + 1}`;
    });

    setProcesses(procs);
  };

  const algorithmInfo = useMemo(() => {
    switch (algorithm) {
      case 'FCFS':
        return {
          mode: 'Non-Preemptive',
          starvation: 'None (Convoy effect possible)',
          rules: 'Processes execute uninterrupted until burst completion. First arrived gets the CPU first.',
          target: 'Batch processing without preemption'
        };
      case 'SJF':
        return {
          mode: 'Non-Preemptive',
          starvation: 'High risk for long processes',
          rules: 'Selects the process with the shortest CPU burst. Cannot be interrupted once scheduled.',
          target: 'Minimizing average waiting time'
        };
      case 'SRTF':
        return {
          mode: 'Preemptive',
          starvation: 'High risk for long processes',
          rules: 'Interrupts running process if a newly arrived process has a shorter remaining burst.',
          target: 'Interactive quick turnaround'
        };
      case 'RR':
        return {
          mode: `Preemptive (q = ${config?.timeQuantum || 2}ms)`,
          starvation: 'Zero (Guaranteed fair share)',
          rules: `Each process runs for at most ${config?.timeQuantum || 2}ms before yielding to the queue tail.`,
          target: 'Time-sharing interactive systems'
        };
      case 'Priority':
        return {
          mode: 'Non-Preemptive',
          starvation: 'High for low-priority jobs',
          rules: 'Dispatches process with the highest priority level (lowest numerical value) to completion.',
          target: 'Real-time tasks with fixed importance'
        };
      case 'PreemptivePriority':
        return {
          mode: 'Preemptive Interrupt',
          starvation: 'High without aging mechanisms',
          rules: 'Immediately preempts execution whenever a higher-priority process enters ready state.',
          target: 'Mission-critical event systems'
        };
      case 'MLQ':
        return {
          mode: 'Inter-Queue Priority',
          starvation: 'High for lower queues',
          rules: 'Processes are permanently partitioned into priority lanes (Q₀ > Q₁ > Q₂) with dedicated sub-schedulers.',
          target: 'Classified foreground & batch jobs'
        };
      case 'MLFQ':
        return {
          mode: 'Dynamic Feedback',
          starvation: 'Prevented (10ms Aging Threshold)',
          rules: 'Quantum exhaustion causes demotion down queues; aging promotes starving processes back to Q₀.',
          target: 'Modern general-purpose OS kernels'
        };
      default:
        return {
          mode: 'Standard',
          starvation: 'Low',
          rules: 'Executes according to engine criteria.',
          target: 'General computing'
        };
    }
  }, [algorithm, config?.timeQuantum]);

  const handleAdd = () => {
    const lastProcess = processes[processes.length - 1];
    const newIdNum = lastProcess ? (parseInt(lastProcess.id.replace('P', '')) || processes.length) + 1 : 1;
    const id = `P${newIdNum}`;
    addProcess({
      id,
      arrivalTime: parseInt(newProcess.arrivalTime) || 0,
      burstTime: parseInt(newProcess.burstTime) || 1,
      priority: parseInt(newProcess.priority) || 1
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        let newProcesses = [];

        if (file.name.endsWith('.json')) {
          newProcesses = JSON.parse(text);
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').filter(l => l.trim() !== '');
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            let p = {};
            headers.forEach((h, idx) => {
              if (h === 'id') p.id = values[idx].trim();
              else if (h === 'arrivaltime' || h === 'arrival_time') p.arrivalTime = parseInt(values[idx]);
              else if (h === 'bursttime' || h === 'burst_time') p.burstTime = parseInt(values[idx]);
              else if (h === 'priority') p.priority = parseInt(values[idx]);
            });
            if (p.id && p.burstTime !== undefined) newProcesses.push(p);
          }
        }

        if (newProcesses.length > 0) {
          useStore.getState().setProcesses(newProcesses);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          alert("Invalid dataset format. Ensure headers are: id, arrivalTime, burstTime, priority");
        }
      } catch (err) {
        alert("Failed to parse dataset: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-zinc-950 p-4 sm:p-5 rounded-xl border border-zinc-900 flex flex-col h-full min-h-0">
      <div className="flex-none mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4 text-zinc-400" /> System Configuration
        </h2>

        <div className="space-y-3 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Scheduling Engine</label>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-zinc-900 text-zinc-400 border-zinc-800">
                {algorithm === 'MLQ' || algorithm === 'MLFQ' ? 'Multi-Queue Engine' : 'Standard Unilevel'}
              </span>
            </div>

            {/* Category Segmented Selector - Pure Monochrome */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800 mb-2">
              <button
                type="button"
                onClick={() => {
                  if (algorithm === 'MLQ' || algorithm === 'MLFQ') {
                    setAlgorithm('FCFS');
                  }
                }}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${algorithm !== 'MLQ' && algorithm !== 'MLFQ'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                  }`}
              >
                Standard Schedulers
              </button>
              <button
                type="button"
                onClick={() => {
                  if (algorithm !== 'MLQ' && algorithm !== 'MLFQ') {
                    setAlgorithm('MLQ');
                  }
                }}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${algorithm === 'MLQ' || algorithm === 'MLFQ'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                  }`}
              >
                Multi-Queue Engines
              </button>
            </div>

            <div className="relative">
              <select
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-white outline-none appearance-none font-medium transition-colors cursor-pointer"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
              >
                {(algorithm === 'MLQ' || algorithm === 'MLFQ' ? [
                  { id: 'MLQ', name: 'Multilevel Queue (MLQ)' },
                  { id: 'MLFQ', name: 'Multi-Level Feedback Queue (MLFQ)' }
                ] : [
                  { id: 'FCFS', name: 'First-Come, First-Served (FCFS)' },
                  { id: 'SJF', name: 'Shortest Job First (SJF)' },
                  { id: 'SRTF', name: 'Shortest Remaining Time (SRTF)' },
                  { id: 'RR', name: 'Round Robin (RR)' },
                  { id: 'Priority', name: 'Priority (Non-Preemptive)' },
                  { id: 'PreemptivePriority', name: 'Priority (Preemptive)' }
                ]).map(item => (
                  <option key={item.id} value={item.id} className="bg-zinc-900 text-white font-normal">
                    {item.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>
          </div>

          {(algorithm === 'RR' || algorithm === 'MLFQ') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">
                {algorithm === 'MLFQ' ? 'Top Queue Quantum (Q₀)' : 'Time Quantum'}
              </label>
              <input
                type="number" min="1"
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-white outline-none font-medium transition-colors"
                value={config.timeQuantum === '' ? '' : config.timeQuantum}
                onChange={(e) => setConfig({ timeQuantum: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </motion.div>
          )}

          {algorithm === 'MLFQ' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800 space-y-1.5"
            >
              <div className="font-semibold text-zinc-200 text-[10px] uppercase tracking-wider flex items-center justify-between">
                <span>MLFQ Dynamic Feedback Architecture:</span>
                <span className="text-[9px] text-zinc-400 font-normal">3 Dynamic Queues</span>
              </div>
              <div className="text-[10px] text-zinc-300">• <span className="font-bold text-sky-400">Q₀</span>: Top Priority Entry Queue (RR q={config.quanta?.[0] || 2})</div>
              <div className="text-[10px] text-zinc-300">• <span className="font-bold text-purple-400">Q₁</span>: Intermediate Priority Queue (RR q={config.quanta?.[1] || 4})</div>
              <div className="text-[10px] text-zinc-300">• <span className="font-bold text-emerald-400">Q₂</span>: Background Batch Queue (RR q={config.quanta?.[2] || 8})</div>
              <div className="text-[9px] text-zinc-500 pt-1 border-t border-zinc-800">
                Processes demote on quantum expiry; promoted to Q₀ upon aging (10ms wait).
              </div>
            </motion.div>
          )}

          {algorithm === 'MLQ' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800 space-y-1.5"
            >
              <div className="font-semibold text-zinc-200 text-[10px] uppercase tracking-wider flex items-center justify-between">
                <span>MLQ Priority Partition Architecture:</span>
                <span className="text-[9px] text-zinc-400 font-normal">3 Fixed Queues</span>
              </div>
              <div className="text-[10px] text-zinc-300">• <span className="font-bold text-sky-400">Q₀</span> (Priority ≤ 1): Real-Time / System (RR q={config.quanta?.[0] || 2})</div>
              <div className="text-[10px] text-zinc-300">• <span className="font-bold text-purple-400">Q₁</span> (Priority = 2): Interactive (RR q={config.quanta?.[1] || 4})</div>
              <div className="text-[10px] text-zinc-300">• <span className="font-bold text-emerald-400">Q₂</span> (Priority ≥ 3): Batch (FCFS)</div>
              <div className="text-[9px] text-zinc-500 pt-1 border-t border-zinc-800">
                Fixed-priority preemption; processes remain strictly in assigned partitions.
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-none flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" /> Process Queue
            <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full ml-1">
              {processes.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {processes.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
                  setProcesses(sorted);
                }}
                className="text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 shadow-xs"
                title="Sort process queue by arrival time (ascending)"
              >
                <ArrowUpDown className="w-3 h-3 text-emerald-400" /> Sort AT
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPresets(true)}
              className="text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 shadow-xs"
              title="Open curated scenario presets"
            >
              <Sparkles className="w-3 h-3 text-sky-400" /> Presets
            </button>
            {processes.length > 0 && (
              <button
                type="button"
                onClick={() => setProcesses([])}
                className="text-[10px] uppercase tracking-wider font-semibold text-red-500/80 hover:text-red-400 transition-colors flex items-center gap-1 px-1.5 py-1"
                title="Clear all processes"
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-[120px] max-h-[220px] overflow-y-auto mb-2.5 pr-1 custom-scrollbar">
          <AnimatePresence initial={false}>
            {processes.slice(0, 50).map(p => {
              const isLarge = processes.length > 50;
              const content = (
                <>
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-950 w-9 h-9 rounded flex items-center justify-center border border-zinc-800 relative">
                      <span className="w-1.5 h-1.5 rounded-full absolute top-1 right-1" style={{ backgroundColor: getProcessColor(p.id) }} />
                      <span className="font-bold text-white text-xs">{p.id}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Arrival</span>
                        {editingCell?.id === p.id && editingCell?.field === 'arrivalTime' ? (
                          <input
                            type="number"
                            min="0"
                            autoFocus
                            value={editingCell.val}
                            onChange={(e) => setEditingCell({ ...editingCell, val: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInline();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            onBlur={handleSaveInline}
                            className="w-12 bg-black border border-sky-400 text-white text-xs font-mono rounded px-1 py-0.2 outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingCell({ id: p.id, field: 'arrivalTime', val: p.arrivalTime })}
                            className="text-zinc-300 text-xs font-medium cursor-pointer hover:text-sky-400 hover:underline transition-colors"
                            title="Click to edit arrival time"
                          >
                            {p.arrivalTime}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Burst</span>
                        {editingCell?.id === p.id && editingCell?.field === 'burstTime' ? (
                          <input
                            type="number"
                            min="1"
                            autoFocus
                            value={editingCell.val}
                            onChange={(e) => setEditingCell({ ...editingCell, val: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInline();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            onBlur={handleSaveInline}
                            className="w-12 bg-black border border-sky-400 text-white text-xs font-mono rounded px-1 py-0.2 outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingCell({ id: p.id, field: 'burstTime', val: p.burstTime })}
                            className="text-zinc-300 text-xs font-medium cursor-pointer hover:text-sky-400 hover:underline transition-colors"
                            title="Click to edit burst time"
                          >
                            {p.burstTime}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Priority</span>
                        {editingCell?.id === p.id && editingCell?.field === 'priority' ? (
                          <input
                            type="number"
                            min="1"
                            autoFocus
                            value={editingCell.val}
                            onChange={(e) => setEditingCell({ ...editingCell, val: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInline();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            onBlur={handleSaveInline}
                            className="w-12 bg-black border border-sky-400 text-white text-xs font-mono rounded px-1 py-0.2 outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingCell({ id: p.id, field: 'priority', val: p.priority })}
                            className="text-zinc-300 text-xs font-medium cursor-pointer hover:text-sky-400 hover:underline transition-colors"
                            title="Click to edit priority"
                          >
                            {p.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeProcess(p.id)}
                    className="text-zinc-600 hover:text-white p-1.5 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              );

              if (isLarge) {
                return (
                  <div key={p.id} className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80 flex items-center justify-between group hover:bg-zinc-900 transition-colors mb-2">
                    {content}
                  </div>
                );
              }

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                  className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80 flex items-center justify-between group hover:bg-zinc-900 transition-colors"
                >
                  {content}
                </motion.div>
              );
            })}
            {processes.length > 50 && (
              <div className="text-center py-3 text-xs font-semibold text-zinc-500 uppercase tracking-widest bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800">
                + {processes.length - 50} more processes loaded
              </div>
            )}
          </AnimatePresence>
          {processes.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center text-zinc-500 p-4 border border-dashed border-zinc-800 rounded-lg h-full min-h-[110px] text-center"
            >
              <Activity className="w-5 h-5 mb-1.5 opacity-40 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-300">Process Queue is Empty</p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-[210px] leading-relaxed">
                Add processes using the form below.
              </p>
            </motion.div>
          )}
        </div>

        <div className="flex-none bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/80 mb-3">
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Arrival</label>
              <input type="number" min="0" value={newProcess.arrivalTime} onKeyDown={e => e.key === 'Enter' && handleAdd()} onChange={e => setNewProcess({ ...newProcess, arrivalTime: e.target.value === '' ? '' : parseInt(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded p-1.5 text-xs font-medium outline-none focus:border-zinc-600 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Burst</label>
              <input type="number" min="1" value={newProcess.burstTime} onKeyDown={e => e.key === 'Enter' && handleAdd()} onChange={e => setNewProcess({ ...newProcess, burstTime: e.target.value === '' ? '' : parseInt(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded p-1.5 text-xs font-medium outline-none focus:border-zinc-600 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Priority</label>
              <input type="number" min="1" value={newProcess.priority} onKeyDown={e => e.key === 'Enter' && handleAdd()} onChange={e => setNewProcess({ ...newProcess, priority: e.target.value === '' ? '' : parseInt(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded p-1.5 text-xs font-medium outline-none focus:border-zinc-600 transition-colors" />
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdd}
              className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-2 rounded transition-colors flex items-center justify-center gap-1.5 text-xs shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </motion.button>
            <input
              type="file"
              accept=".json,.csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white font-medium py-2 rounded transition-colors flex items-center justify-center gap-1.5 text-xs border border-zinc-700/80"
              title="Import JSON or CSV dataset"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-400" /> Import
            </motion.button>
          </div>
        </div>

        {/* Algorithm Mechanics & Behavior Card */}
        <div className="flex-none bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-white" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Algorithm Mechanics & Rules
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
              {algorithm}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-left">
            <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
              <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Preemption Mode
              </span>
              <span className="text-xs font-bold text-white">
                {algorithmInfo.mode}
              </span>
            </div>

            <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
              <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Starvation Risk
              </span>
              <span className={`text-xs font-bold ${algorithmInfo.starvation.toLowerCase().includes('prevented') || algorithmInfo.starvation.toLowerCase().includes('zero') || algorithmInfo.starvation.toLowerCase().includes('none')
                  ? 'text-emerald-400'
                  : algorithmInfo.starvation.toLowerCase().includes('high')
                    ? 'text-red-400'
                    : 'text-zinc-200'
                }`}>
                {algorithmInfo.starvation}
              </span>
            </div>
          </div>

          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-left">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Execution Discipline & Behavior
            </span>
            <p className="text-xs text-zinc-200 font-medium leading-relaxed">
              {algorithmInfo.rules}
            </p>
          </div>

          <div
            className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-left group transition-colors hover:border-zinc-700 cursor-help"
            title={`Optimal Workload Target: ${algorithmInfo.target}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3 h-3 text-zinc-400" />
                Optimal Workload Target
              </span>
              <span className="text-[9px] font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
                Hover info
              </span>
            </div>
            <p className="text-xs text-zinc-200 font-medium leading-relaxed">
              {algorithmInfo.target}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={generateRandomWorkload}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-all border border-zinc-700 shadow-sm"
            title={`Generate 10 random processes tailored for ${algorithm === 'PreemptivePriority' ? 'Preemptive Priority' : algorithm}`}
          >
            <Shuffle className="w-3.5 h-3.5 text-zinc-400" />
            <span>Generate 10 Workload ({algorithm === 'PreemptivePriority' ? 'Priority (P)' : algorithm})</span>
          </motion.button>
        </div>
      </div>

      {/* Curated Presets Modal */}
      <AnimatePresence>
        {showPresets && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Curated Scenarios & Demos</h3>
                    <p className="text-[11px] text-zinc-400">One-click standard OS scheduling experiments</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPresets(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
                {PRESETS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => loadPreset(p)}
                    className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer group flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                          {p.name}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {p.algorithm}
                        </span>
                      </div>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {p.description}
                    </p>
                    <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2 pt-1 border-t border-zinc-800/60">
                      <span>{p.processes.length} Processes:</span>
                      <span>{p.processes.map(x => `${x.id}(BT:${x.burstTime})`).join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
