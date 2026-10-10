import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function GanttChart({ trace }) {
  if (!trace || trace.length === 0) return <div className="text-zinc-600 h-full flex items-center justify-center font-medium">No trace available</div>;

  const data = trace.map((t, index) => ({
    name: t.processId,
    start: t.startTime,
    end: t.endTime,
    duration: t.endTime - t.startTime,
    queue: t.queue,
    index
  }));

  // Muted minimal colors
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

  return (
    <div className="w-full h-full min-h-[250px] bg-zinc-900/30 rounded-lg border border-zinc-800/50 overflow-y-auto custom-scrollbar relative">
      {data.length > 300 && (
        <div className="absolute top-2 right-4 z-10 text-[10px] font-bold tracking-widest text-zinc-500 uppercase bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-zinc-800">
          Showing first 300 timeline events
        </div>
      )}
      <div style={{ height: Math.max(250, Math.min(data.length, 300) * 28), padding: '8px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data.slice(0, 300)}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis type="number" stroke="#71717a" tickLine={false} axisLine={false} tick={{fill: '#a1a1aa', fontSize: 12}} />
            <YAxis dataKey="name" type="category" stroke="#71717a" tickLine={false} axisLine={false} width={60} tick={{fontWeight: '500', fill: '#d4d4d8', fontSize: 12}} />
            <Tooltip content={<CustomTooltip />} cursor={{fill: '#18181b', opacity: 0.5}} />
            <Bar dataKey="duration" radius={[2, 2, 2, 2]} barSize={20} isAnimationActive={false}>
              {data.slice(0, 300).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
