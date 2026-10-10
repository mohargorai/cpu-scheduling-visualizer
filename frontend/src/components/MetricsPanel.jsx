import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function CountUp({ value, decimals = 0, duration = 1000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let animationFrameId;
    const startValue = count;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentCount = startValue + (value - startValue) * ease;
      
      setCount(currentCount);
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };
    
    animationFrameId = window.requestAnimationFrame(step);
    
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return <span>{count.toFixed(decimals)}</span>;
}

export function MetricsPanel({ metrics, avg }) {
  const [page, setPage] = useState(0);
  const pageSize = 30; // 30 processes max per page to guarantee silky smooth animations

  useEffect(() => {
    setPage(0);
  }, [metrics]);

  const totalPages = Math.ceil(metrics.length / pageSize);
  const displayMetrics = metrics.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-none grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">Avg Waiting Time</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white tracking-tight">
              <CountUp value={avg.avgWT} decimals={2} duration={800} />
            </p>
            <p className="text-zinc-500 font-medium text-xs">ms</p>
          </div>
        </div>
        
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">Avg Turnaround Time</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white tracking-tight">
              <CountUp value={avg.avgTAT} decimals={2} duration={800} />
            </p>
            <p className="text-zinc-500 font-medium text-xs">ms</p>
          </div>
        </div>
        
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">CPU Utilization</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white tracking-tight">
              <CountUp value={avg.cpuUtilization} decimals={2} duration={800} />
            </p>
            <p className="text-zinc-500 font-medium text-xs">%</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 flex flex-col min-h-0 relative">
        <div className="flex-none flex justify-between items-center mb-2 px-2">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Individual Process Metrics</h3>
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
              <Legend wrapperStyle={{ paddingTop: '5px', fontSize: '11px' }} iconType="circle" />
              <Bar dataKey="waitingTime" name="Waiting Time" fill="#d4d4d8" radius={[2, 2, 0, 0]} barSize={20} isAnimationActive={true} animationDuration={800} />
              <Bar dataKey="turnaroundTime" name="Turnaround Time" fill="#52525b" radius={[2, 2, 0, 0]} barSize={20} isAnimationActive={true} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
