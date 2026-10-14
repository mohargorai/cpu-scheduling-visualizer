import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function CountUp({ value, decimals = 0 }) {
  const num = typeof value === 'number' ? value : Number(value || 0);
  return <span>{num.toFixed(decimals)}</span>;
}

export function MetricsPanel({ metrics = [], avg = {}, trace = [] }) {
  const [page, setPage] = useState(0);
  const pageSize = 30;

  useEffect(() => {
    setPage(0);
  }, [metrics]);

  const maxEndTime = trace.length > 0 ? trace[trace.length - 1].endTime : 0;
  const throughput = maxEndTime > 0 ? (metrics.length / maxEndTime).toFixed(3) : 0;

  const totalPages = Math.ceil(metrics.length / pageSize);
  const displayMetrics = metrics.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Full Final Results Executive Cards */}
      <div className="flex-none grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800">
          <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-0.5">Average Waiting Time</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-amber-400 tracking-tight">
              <CountUp value={avg.avgWT || 0} decimals={2} />
            </p>
            <p className="text-zinc-500 font-medium text-[10px]">ms</p>
          </div>
        </div>
        
        <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800">
          <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-0.5">Average Turnaround Time</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-sky-400 tracking-tight">
              <CountUp value={avg.avgTAT || 0} decimals={2} />
            </p>
            <p className="text-zinc-500 font-medium text-[10px]">ms</p>
          </div>
        </div>
        
        <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800">
          <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-0.5">CPU Utilization</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-emerald-400 tracking-tight">
              <CountUp value={avg.cpuUtilization || 0} decimals={2} />
            </p>
            <p className="text-zinc-500 font-medium text-[10px]">%</p>
          </div>
        </div>

        <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800">
          <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-0.5">Total Makespan</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-white tracking-tight">
              <CountUp value={maxEndTime} decimals={0} />
            </p>
            <p className="text-zinc-500 font-medium text-[10px]">ms</p>
          </div>
        </div>

        <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 col-span-2 sm:col-span-1">
          <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-0.5">System Throughput</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold text-purple-400 tracking-tight">{throughput}</p>
            <p className="text-zinc-500 font-medium text-[10px]">p/ms</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 flex flex-col min-h-0 relative">
        <div className="flex-none flex justify-between items-center mb-2 px-2">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Individual Process Metrics</h3>
            <div className="hidden sm:flex items-center gap-2.5 text-[10px]">
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-2 h-2 rounded-xs bg-sky-400 inline-block"></span> Turnaround
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-2 h-2 rounded-xs bg-amber-400 inline-block"></span> Waiting
              </span>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 hover:text-white disabled:opacity-30 text-zinc-500 transition-colors"
              ><ChevronLeft className="w-3.5 h-3.5" /></button>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Pg {page + 1}/{totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="p-1 hover:text-white disabled:opacity-30 text-zinc-500 transition-colors"
              ><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 w-full relative">
          <ResponsiveContainer width="100%" height="100%" className="absolute inset-0">
            <BarChart data={displayMetrics} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="id" stroke="#71717a" tickLine={false} axisLine={false} dy={5} tick={{fill: '#a1a1aa', fontSize: 11}} />
              <YAxis stroke="#71717a" tickLine={false} axisLine={false} tick={{fill: '#a1a1aa', fontSize: 11}} />
              <Tooltip 
                cursor={{fill: '#27272a', opacity: 0.4}}
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ fontWeight: '500', color: '#fafafa' }}
              />
              <Bar dataKey="turnaroundTime" name="Turnaround Time" fill="#38bdf8" radius={[2, 2, 0, 0]} barSize={16} isAnimationActive={false} />
              <Bar dataKey="waitingTime" name="Waiting Time" fill="#fbbf24" radius={[2, 2, 0, 0]} barSize={16} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
