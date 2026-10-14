// frontend/src/components/AlgorithmComparison.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from '../store';
import { GanttChart } from './GanttChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Sparkles, Loader2, Download, Scale } from 'lucide-react';
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

  const calcDelta = (valA = 0, valB = 0, inverse = false) => {
    if (valA === 0) return { pct: '0%', isBetter: true };
    const diff = ((valB - valA) / valA) * 100;
    const isBetter = inverse ? diff > 0 : diff < 0;
    const sign = diff > 0 ? '+' : '';
    return {
      pct: `${sign}${diff.toFixed(1)}%`,
      isBetter,
      diff
    };
  };

  const tatDelta = calcDelta(avgA.avgTAT, avgB.avgTAT, false);
  const wtDelta = calcDelta(avgA.avgWT, avgB.avgWT, false);
  const utilDelta = calcDelta(avgA.cpuUtilization, avgB.cpuUtilization, true);

  const makespanA = resultA?.trace?.length > 0 ? resultA.trace[resultA.trace.length - 1].endTime : 0;
  const makespanB = resultB?.trace?.length > 0 ? resultB.trace[resultB.trace.length - 1].endTime : 0;
  const makespanDelta = calcDelta(makespanA, makespanB, false);

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
    <div className="flex flex-col gap-5">
      {/* Selector & Action Ribbon */}
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Algorithm A:</span>
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
            <span className="text-[10px] uppercase font-bold text-zinc-500">Algorithm B:</span>
            <select
              value={algoB}
              onChange={(e) => setAlgoB(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:border-zinc-700"
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

      {/* Delta Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Average Turnaround Time */}
        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Average Turnaround (TAT)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-sky-400">{(avgB.avgTAT || 0).toFixed(2)} ms</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              tatDelta.isBetter 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {tatDelta.pct} vs {algoA}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Baseline ({algoA}): {(avgA.avgTAT || 0).toFixed(2)} ms</span>
        </div>

        {/* Average Waiting Time */}
        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Average Waiting Time (WT)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-400">{(avgB.avgWT || 0).toFixed(2)} ms</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              wtDelta.isBetter 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {wtDelta.pct} vs {algoA}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Baseline ({algoA}): {(avgA.avgWT || 0).toFixed(2)} ms</span>
        </div>

        {/* CPU Utilization */}
        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-500">CPU Utilization</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-400">{(avgB.cpuUtilization || 0).toFixed(2)} %</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              utilDelta.isBetter 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {utilDelta.pct} vs {algoA}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Baseline ({algoA}): {(avgA.cpuUtilization || 0).toFixed(2)} %</span>
        </div>

        {/* Total Makespan */}
        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Total Makespan</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-white">{makespanB} ms</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              makespanDelta.isBetter 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {makespanDelta.pct}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Baseline ({algoA}): {makespanA} ms</span>
        </div>
      </div>

      {/* Side-by-Side Dual Gantt Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Algo A Timeline */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <h3 className="text-xs font-bold text-white">{algoA} Execution Timeline</h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Makespan: {makespanA}ms</span>
          </div>
          <div className="flex-1 min-h-[320px]">
            {resultA ? <GanttChart trace={resultA.trace} /> : <div className="text-zinc-600 h-full flex items-center justify-center">Loading...</div>}
          </div>
        </div>

        {/* Algo B Timeline */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <h3 className="text-xs font-bold text-white">{algoB} Execution Timeline</h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Makespan: {makespanB}ms</span>
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
            <p className="text-[11px] text-zinc-500 mt-0.5">Direct per-process execution latency comparison</p>
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
