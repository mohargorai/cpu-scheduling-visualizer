// frontend/src/components/AlgorithmComparison.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from '../store';
import { GanttChart } from './GanttChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Sparkles, Loader2, Download, Scale, Trophy, ArrowRight } from 'lucide-react';
import { exportSimulationReport } from '../utils/reportExporter';
import { runSimulationEngine } from '../simulator';

const ALGORITHMS = [
  { id: 'FCFS', name: 'First-Come, First-Served (FCFS)' },
  { id: 'SJF', name: 'Shortest Job First (SJF)' },
  { id: 'SRTF', name: 'Shortest Remaining Time First (SRTF)' },
  { id: 'RR', name: 'Round Robin (RR)' },
  { id: 'Priority', name: 'Priority (Non-Preemptive)' },
  { id: 'PreemptivePriority', name: 'Priority (Preemptive)' },
  { id: 'MLQ', name: 'Multilevel Queue (MLQ)' },
  { id: 'MLFQ', name: 'Multi-Level Feedback Queue (MLFQ)' },
];

export function AlgorithmComparison() {
  const { processes, config } = useStore();
  const [algoA, setAlgoA] = useState('FCFS');
  const [algoB, setAlgoB] = useState('MLFQ');
  const [resultA, setResultA] = useState(null);
  const [resultB, setResultB] = useState(null);
  const [loading, setLoading] = useState(false);

  const runComparison = async () => {
    if (processes.length === 0) return;
    setLoading(true);
    try {
      let resDataA = null;
      let resDataB = null;

      const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');
      if (API_URL) {
        try {
          const [resA, resB] = await Promise.all([
            axios.post(`${API_URL}/api/simulate`, { algorithm: algoA, processes, config }, { timeout: 2500 }),
            axios.post(`${API_URL}/api/simulate`, { algorithm: algoB, processes, config }, { timeout: 2500 })
          ]);
          if (resA?.data?.trace && resB?.data?.trace) {
            resDataA = resA.data;
            resDataB = resB.data;
          }
        } catch (apiErr) {
          console.warn("Backend API unreachable for comparison, using client simulation engine:", apiErr.message);
        }
      }

      if (!resDataA || !resDataB) {
        resDataA = runSimulationEngine({ algorithm: algoA, processes, config });
        resDataB = runSimulationEngine({ algorithm: algoB, processes, config });
      }

      setResultA(resDataA);
      setResultB(resDataB);
    } catch (err) {
      console.error(err);
      alert('Failed to simulate algorithms for comparison: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (processes.length > 0) {
      runComparison();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processes, algoA, algoB, config]);

  if (processes.length === 0) {
    return (
      <div className="h-[450px] flex flex-col items-center justify-center text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-900 p-8 text-center">
        <Scale className="w-12 h-12 text-zinc-600 mb-3" />
        <h3 className="text-lg font-bold text-zinc-300">No Processes Configured</h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          Add processes or load an educational preset on the Visualizer tab to perform comparative analysis.
        </p>
      </div>
    );
  }

  const avgA = resultA?.averageMetrics || {};
  const avgB = resultB?.averageMetrics || {};

  const formatLatencyDelta = (valA = 0, valB = 0) => {
    if (valA === 0 && valB === 0) return { text: 'Identical (0.0%)', color: 'zinc' };
    if (valA === 0) return { text: 'N/A', color: 'zinc' };
    const diff = ((valB - valA) / valA) * 100;
    if (Math.abs(diff) < 0.05) return { text: 'Identical (0.0%)', color: 'zinc' };
    if (diff < 0) {
      return { text: `↓ ${Math.abs(diff).toFixed(1)}% faster`, color: 'emerald' };
    }
    return { text: `↑ +${diff.toFixed(1)}% slower`, color: 'red' };
  };

  const formatUtilDelta = (valA = 0, valB = 0) => {
    const diff = valB - valA;
    if (Math.abs(diff) < 0.05) return { text: 'Identical (0.0%)', color: 'zinc' };
    if (diff > 0) return { text: `↑ +${diff.toFixed(1)}% higher`, color: 'emerald' };
    return { text: `↓ ${Math.abs(diff).toFixed(1)}% lower`, color: 'red' };
  };

  const formatMakespanDelta = (valA = 0, valB = 0) => {
    const diff = valB - valA;
    if (diff === 0) return { text: 'Equal makespan', color: 'zinc' };
    if (diff < 0) return { text: `↓ ${Math.abs(diff)} ms faster`, color: 'emerald' };
    return { text: `↑ +${diff} ms slower`, color: 'red' };
  };

  const tatDelta = formatLatencyDelta(avgA.avgTAT, avgB.avgTAT);
  const wtDelta = formatLatencyDelta(avgA.avgWT, avgB.avgWT);
  const utilDelta = formatUtilDelta(avgA.cpuUtilization, avgB.cpuUtilization);

  const makespanA = resultA?.trace?.length > 0 ? resultA.trace[resultA.trace.length - 1].endTime : 0;
  const makespanB = resultB?.trace?.length > 0 ? resultB.trace[resultB.trace.length - 1].endTime : 0;
  const makespanDelta = formatMakespanDelta(makespanA, makespanB);

  // Educational executive verdict
  const getEducationalVerdict = () => {
    if (!resultA || !resultB) return null;
    const wtA = avgA.avgWT ?? 0;
    const wtB = avgB.avgWT ?? 0;
    const diff = wtA === 0 ? 0 : ((wtB - wtA) / wtA) * 100;

    if (Math.abs(diff) < 0.1) {
      return {
        winner: 'Tie',
        headline: `${algoA} and ${algoB} yield identical average waiting times (${wtA.toFixed(2)} ms).`,
        detail: 'Both scheduling algorithms yield the exact same waiting efficiency for this specific process workload.'
      };
    }

    const winner = wtB < wtA ? algoB : algoA;
    const loser = wtB < wtA ? algoA : algoB;
    const winnerWT = Math.min(wtA, wtB).toFixed(2);
    const loserWT = Math.max(wtA, wtB).toFixed(2);
    const percentBetter = Math.abs(diff < 0 ? diff : ((wtA - wtB) / wtB) * 100).toFixed(1);

    const insights = {
      'FCFS_MLFQ': 'MLFQ preemptively slices CPU bursts across prioritized queues to eliminate the Convoy Effect, providing interactive processes immediate execution.',
      'MLFQ_FCFS': 'MLFQ preemptively slices CPU bursts across prioritized queues to eliminate the Convoy Effect, providing interactive processes immediate execution.',
      'FCFS_SJF': 'SJF minimizes overall queue waiting times by executing short jobs before long jobs, dramatically decreasing average latency.',
      'SJF_FCFS': 'SJF minimizes overall queue waiting times by executing short jobs before long jobs, dramatically decreasing average latency.',
      'FCFS_SRTF': 'SRTF preemption immediately suspends long jobs when short burst arrivals occur, giving near-optimal latency.',
      'SRTF_FCFS': 'SRTF preemption immediately suspends long jobs when short burst arrivals occur, giving near-optimal latency.',
      'FCFS_RR': 'Round Robin guarantees fair CPU time-slicing across all processes, preventing any single long task from monopolizing the processor.',
      'RR_FCFS': 'Round Robin guarantees fair CPU time-slicing across all processes, preventing any single long task from monopolizing the processor.'
    };

    const key = `${algoA}_${algoB}`;
    const detail = insights[key] || `${winner} scheduled high-priority and shorter burst tasks with superior dispatch efficiency.`;

    return {
      winner,
      headline: `${winner} outperformed ${loser} with ${percentBetter}% lower average waiting time (${winnerWT} ms vs ${loserWT} ms).`,
      detail
    };
  };

  const verdict = getEducationalVerdict();

  // Comparative individual process data
  const comparativeChartData = processes.map(p => {
    const mA = resultA?.metrics?.find(m => m.id === p.id);
    const mB = resultB?.metrics?.find(m => m.id === p.id);
    return {
      id: p.id,
      [`TAT (${algoA})`]: mA?.turnaroundTime || 0,
      [`TAT (${algoB})`]: mB?.turnaroundTime || 0,
      [`WT (${algoA})`]: mA?.waitingTime || 0,
      [`WT (${algoB})`]: mB?.waitingTime || 0,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Selector & Action Ribbon */}
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Algorithm A (Baseline):</span>
            <select
              value={algoA}
              onChange={(e) => setAlgoA(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:border-zinc-700"
            >
              {ALGORITHMS.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="text-zinc-600 font-bold text-xs px-1">VS</div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-sky-400">Algorithm B (Comparison):</span>
            <select
              value={algoB}
              onChange={(e) => setAlgoB(e.target.value)}
              className="bg-zinc-900 border border-sky-900/60 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:border-sky-600"
            >
              {ALGORITHMS.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => exportSimulationReport({ algorithm: `${algoA}_vs_${algoB}`, processes, simulationResult: resultB, title: `Algorithm Comparison: ${algoA} vs ${algoB}` })}
            disabled={!resultB}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-40"
            title="Export high-resolution comparison report PNG"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export Report (PNG)</span>
          </button>

          <button
            onClick={runComparison}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 fill-current" />}
            <span>Re-Compare</span>
          </button>
        </div>
      </div>

      {/* Educational Executive Verdict Banner */}
      {verdict && (
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900/70 to-zinc-950 border border-zinc-800/90 rounded-xl p-3.5 sm:p-4 shadow-xl flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Key Takeaway
              </span>
              <span className="text-xs font-bold text-white">
                {verdict.headline}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              {verdict.detail}
            </p>
          </div>
        </div>
      )}

      {/* Side-by-Side Dual Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Average Turnaround Time */}
        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900/80">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Average Turnaround (TAT)</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              tatDelta.color === 'emerald'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : tatDelta.color === 'red'
                ? 'bg-red-500/10 text-red-400 border-red-500/25'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {tatDelta.text}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2.5 items-center">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-zinc-500 font-semibold truncate" title={algoA}>A: {algoA}</span>
              <span className="text-sm sm:text-base font-bold text-zinc-300">
                {(avgA.avgTAT || 0).toFixed(2)} <span className="text-[10px] text-zinc-500 font-normal">ms</span>
              </span>
            </div>
            <div className="flex flex-col min-w-0 border-l border-zinc-800/80 pl-2.5 sm:pl-3">
              <span className="text-[10px] text-sky-400 font-semibold truncate" title={algoB}>B: {algoB}</span>
              <span className="text-base sm:text-lg font-black text-sky-400">
                {(avgB.avgTAT || 0).toFixed(2)} <span className="text-[10px] text-sky-500/70 font-normal">ms</span>
              </span>
            </div>
          </div>
          
          <span className="text-[9px] text-zinc-500">Total time from arrival to completion</span>
        </div>

        {/* Average Waiting Time */}
        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900/80">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Average Waiting Time (WT)</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              wtDelta.color === 'emerald'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : wtDelta.color === 'red'
                ? 'bg-red-500/10 text-red-400 border-red-500/25'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {wtDelta.text}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2.5 items-center">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-zinc-500 font-semibold truncate" title={algoA}>A: {algoA}</span>
              <span className="text-sm sm:text-base font-bold text-zinc-300">
                {(avgA.avgWT || 0).toFixed(2)} <span className="text-[10px] text-zinc-500 font-normal">ms</span>
              </span>
            </div>
            <div className="flex flex-col min-w-0 border-l border-zinc-800/80 pl-2.5 sm:pl-3">
              <span className="text-[10px] text-amber-400 font-semibold truncate" title={algoB}>B: {algoB}</span>
              <span className="text-base sm:text-lg font-black text-amber-400">
                {(avgB.avgWT || 0).toFixed(2)} <span className="text-[10px] text-amber-500/70 font-normal">ms</span>
              </span>
            </div>
          </div>

          <span className="text-[9px] text-zinc-500">Time spent in ready queues waiting for CPU</span>
        </div>

        {/* CPU Utilization */}
        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900/80">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">CPU Utilization</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              utilDelta.color === 'emerald'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : utilDelta.color === 'red'
                ? 'bg-red-500/10 text-red-400 border-red-500/25'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {utilDelta.text}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2.5 items-center">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-zinc-500 font-semibold truncate" title={algoA}>A: {algoA}</span>
              <span className="text-sm sm:text-base font-bold text-zinc-300">
                {(avgA.cpuUtilization || 0).toFixed(1)} <span className="text-[10px] text-zinc-500 font-normal">%</span>
              </span>
            </div>
            <div className="flex flex-col min-w-0 border-l border-zinc-800/80 pl-2.5 sm:pl-3">
              <span className="text-[10px] text-emerald-400 font-semibold truncate" title={algoB}>B: {algoB}</span>
              <span className="text-base sm:text-lg font-black text-emerald-400">
                {(avgB.cpuUtilization || 0).toFixed(1)} <span className="text-[10px] text-emerald-500/70 font-normal">%</span>
              </span>
            </div>
          </div>

          <span className="text-[9px] text-zinc-500">Percentage of active CPU busy cycles</span>
        </div>

        {/* Total Makespan */}
        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900/80">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total Makespan</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              makespanDelta.color === 'emerald'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : makespanDelta.color === 'red'
                ? 'bg-red-500/10 text-red-400 border-red-500/25'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {makespanDelta.text}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2.5 items-center">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-zinc-500 font-semibold truncate" title={algoA}>A: {algoA}</span>
              <span className="text-sm sm:text-base font-bold text-zinc-300">
                {makespanA} <span className="text-[10px] text-zinc-500 font-normal">ms</span>
              </span>
            </div>
            <div className="flex flex-col min-w-0 border-l border-zinc-800/80 pl-2.5 sm:pl-3">
              <span className="text-[10px] text-zinc-200 font-semibold truncate" title={algoB}>B: {algoB}</span>
              <span className="text-base sm:text-lg font-black text-white">
                {makespanB} <span className="text-[10px] text-zinc-400 font-normal">ms</span>
              </span>
            </div>
          </div>

          <span className="text-[9px] text-zinc-500">Total completion time for all processes</span>
        </div>
      </div>

      {/* Side-by-Side Dual Gantt Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Algo A Timeline */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                ALGO A
              </span>
              <h3 className="text-xs font-bold text-white">{algoA} Execution Timeline</h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Total Time: {makespanA}ms</span>
          </div>
          <div className="flex-1 min-h-[320px]">
            {resultA ? <GanttChart trace={resultA.trace} /> : <div className="text-zinc-600 h-full flex items-center justify-center">Loading...</div>}
          </div>
        </div>

        {/* Algo B Timeline */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                ALGO B
              </span>
              <h3 className="text-xs font-bold text-sky-400">{algoB} Execution Timeline</h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Total Time: {makespanB}ms</span>
          </div>
          <div className="flex-1 min-h-[320px]">
            {resultB ? <GanttChart trace={resultB.trace} /> : <div className="text-zinc-600 h-full flex items-center justify-center">Loading...</div>}
          </div>
        </div>
      </div>

      {/* Comparative Bar Chart: Process Turnaround Comparison */}
      <div className="bg-zinc-950 p-4 sm:p-5 rounded-xl border border-zinc-900 flex flex-col gap-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
          <div>
            <h3 className="text-sm font-semibold text-white">Process Turnaround Time: {algoA} vs {algoB}</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Direct per-process execution latency comparison (lower bars indicate faster completion)</p>
          </div>
        </div>
        <div className="w-full h-[260px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparativeChartData.slice(0, 25)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="id" stroke="#71717a" tickLine={false} axisLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <YAxis stroke="#71717a" tickLine={false} axisLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <Tooltip 
                cursor={{ fill: '#27272a', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ fontWeight: '500', color: '#fafafa' }}
              />
              <Legend wrapperStyle={{ paddingTop: '5px', fontSize: '11px' }} />
              <Bar dataKey={`TAT (${algoA})`} fill="#71717a" radius={[2, 2, 0, 0]} barSize={14} isAnimationActive={false} />
              <Bar dataKey={`TAT (${algoB})`} fill="#38bdf8" radius={[2, 2, 0, 0]} barSize={14} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
