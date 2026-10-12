import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const colors = ['#e4e4e7', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a'];

const getColor = (processId) => {
  if (processId === 'IDLE') return '#18181b';
  const num = parseInt(processId.replace('P', '')) || 0;
  return colors[num % colors.length];
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-xl text-sm min-w-[140px]">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-900">
          <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: getColor(d.name)}}></div>
          <p className="font-semibold text-white">{d.name === 'IDLE' ? 'CPU Idle' : `Process ${d.name}`}</p>
        </div>
        <div className="space-y-1 text-zinc-400 text-xs">
          <p className="flex justify-between"><span>Start:</span> <span className="text-zinc-200">{d.start} ms</span></p>
          <p className="flex justify-between"><span>End:</span> <span className="text-zinc-200">{d.end} ms</span></p>
          <p className="flex justify-between font-medium"><span>Duration:</span> <span className="text-white">{d.duration} ms</span></p>
          {d.queue !== undefined && <p className="flex justify-between text-zinc-500 pt-1"><span>Queue:</span> <span>Q{d.queue}</span></p>}
        </div>
      </div>
    );
  }
  return null;
};

export function GanttChart({ trace }) {
  const [page, setPage] = useState(0);
  const [prevTrace, setPrevTrace] = useState(trace);
  const pageSize = 15;

  if (prevTrace !== trace) {
    setPrevTrace(trace);
    setPage(0);
  }

  const { totalPages, displayData } = useMemo(() => {
    if (!trace || trace.length === 0) {
      return { totalPages: 0, displayData: [] };
    }
    const data = [];
    for (let i = 0; i < trace.length; i++) {
      const t = trace[i];
      const last = data[data.length - 1];
      if (last && last.name === t.processId) {
        last.duration += (t.endTime - t.startTime);
        last.end = t.endTime;
      } else {
        data.push({
          name: t.processId,
          start: t.startTime,
          end: t.endTime,
          duration: t.endTime - t.startTime,
          queue: t.queue,
          index: i
        });
      }
    }

    return {
      totalPages: Math.ceil(data.length / pageSize),
      displayData: data.slice(page * pageSize, (page + 1) * pageSize)
    };
  }, [trace, page]);

  if (!trace || trace.length === 0) return <div className="text-zinc-600 h-full flex items-center justify-center font-medium">No trace available</div>;

  return (
    <div className="w-full h-full bg-zinc-900/30 rounded-lg border border-zinc-800/50 flex flex-col justify-between overflow-hidden">
      <div className="w-full flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2">
        <div style={{ height: displayData.length <= 6 ? '100%' : `${displayData.length * 26}px`, minHeight: '200px' }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={displayData}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" stroke="#71717a" tickLine={false} axisLine={false} tick={{fill: '#a1a1aa', fontSize: 11}} />
              <YAxis dataKey="name" type="category" stroke="#71717a" tickLine={false} axisLine={false} width={50} tick={{fontWeight: '500', fill: '#d4d4d8', fontSize: 11}} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: '#18181b', opacity: 0.5}} />
              <Bar dataKey="duration" radius={[2, 2, 2, 2]} barSize={16} isAnimationActive={true} animationDuration={800}>
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${page}-${index}`} fill={getColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex-none flex items-center justify-center gap-4 py-2 border-t border-zinc-800/50 bg-zinc-950/80 sticky bottom-0">
          <button 
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1 hover:text-white disabled:opacity-30 text-zinc-500 transition-colors"
          ><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Page {page + 1} of {totalPages}
          </span>
          <button 
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="p-1 hover:text-white disabled:opacity-30 text-zinc-500 transition-colors"
          ><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
