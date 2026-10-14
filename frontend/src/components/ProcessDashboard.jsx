import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { 
  Search, Download, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Clock, Play, Loader2, FileSpreadsheet, CheckCircle2, BarChart3
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getProcessColor } from './GanttChart';

export function ProcessDashboard({ onRunSimulation, loading }) {
  const { processes, algorithm, simulationResult } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQueueFilter, setSelectedQueueFilter] = useState('all');

  const isMultiQueue = algorithm === 'MLQ' || algorithm === 'MLFQ';

  // Compute rich per-process metrics combined from processes & simulationResult
  const fullProcessData = useMemo(() => {
    if (!processes || processes.length === 0) return [];
    
    const metricsMap = {};
    if (simulationResult?.metrics) {
      for (const m of simulationResult.metrics) {
        const pId = m.id || m.processId;
        if (pId) metricsMap[pId] = m;
      }
    }

    // Response time and preemption slices calculation from trace
    const firstResponseMap = {};
    const slicesCountMap = {};
    const finalQueueMap = {};

    if (simulationResult?.trace) {
      for (const t of simulationResult.trace) {
        if (t.processId === 'IDLE') continue;
        if (firstResponseMap[t.processId] === undefined) {
          firstResponseMap[t.processId] = t.startTime;
        }
        slicesCountMap[t.processId] = (slicesCountMap[t.processId] || 0) + 1;
        if (t.queue !== undefined) {
          finalQueueMap[t.processId] = t.queue;
        }
      }
    }

    return processes.map((p) => {
      const metric = metricsMap[p.id];
      const arrivalTime = p.arrivalTime;
      const burstTime = p.burstTime;
      const priority = p.priority;
      const completionTime = metric?.completionTime ?? null;
      const turnaroundTime = metric?.turnaroundTime ?? null;
      const waitingTime = metric?.waitingTime ?? null;
      const firstStart = firstResponseMap[p.id];
      const responseTime = firstStart !== undefined ? Math.max(0, firstStart - arrivalTime) : null;
      const slices = slicesCountMap[p.id] ?? 0;
      const queue = finalQueueMap[p.id] ?? (isMultiQueue ? (priority <= 1 ? 0 : priority === 2 ? 1 : 2) : 0);
      const penaltyRatio = turnaroundTime !== null && burstTime > 0 ? (turnaroundTime / burstTime).toFixed(2) : '-';

      return {
        id: p.id,
        numId: parseInt(p.id.replace('P', '')) || 0,
        arrivalTime,
        burstTime,
        priority,
        completionTime,
        turnaroundTime,
        waitingTime,
        responseTime,
        slices,
        queue,
        penaltyRatio,
        isCompleted: completionTime !== null
      };
    });
  }, [processes, simulationResult, isMultiQueue]);

  // Overall aggregate metrics
  const stats = useMemo(() => {
    const total = fullProcessData.length;
    if (total === 0 || !simulationResult) {
      return {
        total: processes.length,
        completed: 0,
        avgWT: 0,
        avgTAT: 0,
        avgRT: 0,
        cpuUtil: 0,
        maxEndTime: 0,
        throughput: 0
      };
    }

    const completed = fullProcessData.filter(p => p.isCompleted).length;
    const avgWT = simulationResult.averageMetrics?.avgWT ?? 
      (fullProcessData.reduce((acc, p) => acc + (p.waitingTime || 0), 0) / (completed || 1));
    const avgTAT = simulationResult.averageMetrics?.avgTAT ?? 
      (fullProcessData.reduce((acc, p) => acc + (p.turnaroundTime || 0), 0) / (completed || 1));
    
    const rtSum = fullProcessData.reduce((acc, p) => acc + (p.responseTime !== null ? p.responseTime : 0), 0);
    const avgRT = rtSum / (completed || 1);

    const cpuUtil = simulationResult.averageMetrics?.cpuUtilization ?? 0;
    const maxEndTime = simulationResult.trace?.length > 0 
      ? simulationResult.trace[simulationResult.trace.length - 1].endTime 
      : 0;
    const throughput = maxEndTime > 0 ? (completed / maxEndTime).toFixed(3) : 0;

    return {
      total,
      completed,
      avgWT: avgWT.toFixed(2),
      avgTAT: avgTAT.toFixed(2),
      avgRT: avgRT.toFixed(2),
      cpuUtil: cpuUtil.toFixed(2),
      maxEndTime,
      throughput
    };
  }, [fullProcessData, simulationResult, processes.length]);

  // Filter & Sort
  const filteredData = useMemo(() => {
    return fullProcessData.filter(item => {
      const matchesSearch = item.id.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const matchesQueue = selectedQueueFilter === 'all' || item.queue === parseInt(selectedQueueFilter);
      return matchesSearch && matchesQueue;
    });
  }, [fullProcessData, searchTerm, selectedQueueFilter]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'id') {
        valA = a.numId;
        valB = b.numId;
      }

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    if (pageSize === 'all') return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export functions
  const exportToCSV = () => {
    if (sortedData.length === 0) return;
    const headers = ['Process ID', 'Arrival Time', 'Burst Time', 'Priority', 'Completion Time', 'Turnaround Time', 'Waiting Time', 'Response Time', 'Preemptions/Slices', 'Queue'];
    const rows = sortedData.map(p => [
      p.id,
      p.arrivalTime,
      p.burstTime,
      p.priority,
      p.completionTime ?? 'N/A',
      p.turnaroundTime ?? 'N/A',
      p.waitingTime ?? 'N/A',
      p.responseTime ?? 'N/A',
      p.slices,
      isMultiQueue ? `Q${p.queue}` : 'Standard'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cpu_scheduling_${algorithm.toLowerCase()}_process_metrics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (sortedData.length === 0) return;
    const exportObject = {
      algorithm,
      totalProcesses: sortedData.length,
      summary: stats,
      processes: sortedData
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cpu_scheduling_${algorithm.toLowerCase()}_metrics.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full flex flex-col gap-5 text-zinc-100 font-sans pb-10">
      
      {/* Top Banner: Key Executive Performance Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Total Processes</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-white tracking-tight">{stats.total}</span>
            <span className="text-[10px] text-zinc-500">processes</span>
          </div>
        </div>

        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Average Waiting Time</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-amber-400 tracking-tight">{stats.avgWT}</span>
            <span className="text-[10px] text-zinc-500">ms</span>
          </div>
        </div>

        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Average Turnaround Time</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-sky-400 tracking-tight">{stats.avgTAT}</span>
            <span className="text-[10px] text-zinc-500">ms</span>
          </div>
        </div>

        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Average Response Time</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-emerald-400 tracking-tight">{stats.avgRT}</span>
            <span className="text-[10px] text-zinc-500">ms</span>
          </div>
        </div>

        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">CPU Utilization</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-emerald-400 tracking-tight">{stats.cpuUtil}</span>
            <span className="text-[10px] text-zinc-500">%</span>
          </div>
        </div>

        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Total Makespan (Time)</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-white tracking-tight">{stats.maxEndTime}</span>
            <span className="text-[10px] text-zinc-500">ms</span>
          </div>
        </div>

        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">System Throughput</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-purple-400 tracking-tight">{stats.throughput}</span>
            <span className="text-[10px] text-zinc-500">p/ms</span>
          </div>
        </div>
      </div>

      {/* Warning banner if simulation has not run yet */}
      {!simulationResult && (
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded-lg text-zinc-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Simulation Not Executed</p>
              <p className="text-xs text-zinc-400 mt-0.5">Metrics will populate once you dispatch the simulation engine.</p>
            </div>
          </div>
          <button
            onClick={onRunSimulation}
            disabled={loading || processes.length === 0}
            className="flex items-center gap-2 bg-white text-black font-bold px-4 py-2 rounded-lg text-xs hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Run Simulation Now</span>
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-zinc-950 rounded-xl border border-zinc-900 p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
        
        {/* Table Controls Strip */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-2 border-b border-zinc-900">
          
          {/* Left: Search & Filter */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-xs min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Process ID (e.g. P1)..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-zinc-900/90 border border-zinc-800 text-white rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-white outline-none placeholder:text-zinc-600 transition-colors"
              />
            </div>

            {isMultiQueue && (
              <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800 text-xs">
                <span className="text-[10px] text-zinc-500 px-1 font-semibold uppercase">Queue:</span>
                <button
                  onClick={() => { setSelectedQueueFilter('all'); setCurrentPage(1); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${selectedQueueFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  All
                </button>
                <button
                  onClick={() => { setSelectedQueueFilter('0'); setCurrentPage(1); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${selectedQueueFilter === '0' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  Q₀
                </button>
                <button
                  onClick={() => { setSelectedQueueFilter('1'); setCurrentPage(1); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${selectedQueueFilter === '1' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  Q₁
                </button>
                <button
                  onClick={() => { setSelectedQueueFilter('2'); setCurrentPage(1); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${selectedQueueFilter === '2' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  Q₂
                </button>
              </div>
            )}
          </div>

          {/* Right: Export & Rows per page */}
          <div className="flex items-center gap-2 justify-end">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mr-2">
              <span className="text-[10px] uppercase font-semibold text-zinc-500">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-zinc-900 border border-zinc-800 text-white rounded p-1 text-xs outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All</option>
              </select>
            </div>

            <button
              onClick={exportToCSV}
              disabled={sortedData.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-300 transition-colors disabled:opacity-30"
              title="Download CSV report"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={exportToJSON}
              disabled={sortedData.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-300 transition-colors disabled:opacity-30"
              title="Download JSON dataset"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto custom-scrollbar rounded-lg border border-zinc-900">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900/70 border-b border-zinc-800/80 text-zinc-400 font-semibold select-none">
                <th onClick={() => handleSort('id')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Process ID</span>
                    {sortField === 'id' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th onClick={() => handleSort('arrivalTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Arrival Time (AT)</span>
                    {sortField === 'arrivalTime' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th onClick={() => handleSort('burstTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Burst Time (BT)</span>
                    {sortField === 'burstTime' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th onClick={() => handleSort('priority')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Priority Level</span>
                    {sortField === 'priority' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                {isMultiQueue && (
                  <th onClick={() => handleSort('queue')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Assigned Queue</span>
                      {sortField === 'queue' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </div>
                  </th>
                )}
                <th onClick={() => handleSort('completionTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Completion Time (CT)</span>
                    {sortField === 'completionTime' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th onClick={() => handleSort('turnaroundTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Turnaround Time (TAT)</span>
                    {sortField === 'turnaroundTime' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th onClick={() => handleSort('waitingTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Waiting Time (WT)</span>
                    {sortField === 'waitingTime' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th onClick={() => handleSort('responseTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Response Time (RT)</span>
                    {sortField === 'responseTime' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th onClick={() => handleSort('slices')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-1">
                    <span>Preemptions / Slices</span>
                    {sortField === 'slices' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="py-2.5 px-3">
                  <span>Execution Status</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-medium">
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-zinc-900/40 transition-colors group"
                  >
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1.5 font-bold text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getProcessColor(row.id) }} />
                        <span>{row.id}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300 font-mono">{row.arrivalTime} ms</td>
                    <td className="py-2.5 px-3 text-zinc-300 font-mono">{row.burstTime} ms</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-300">
                        P{row.priority}
                      </span>
                    </td>
                    {isMultiQueue && (
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-200">
                          Q{row.queue}
                        </span>
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-zinc-200 font-mono">
                      {row.completionTime !== null ? `${row.completionTime} ms` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-sky-400">
                      {row.turnaroundTime !== null ? `${row.turnaroundTime} ms` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-amber-400">
                      {row.waitingTime !== null ? `${row.waitingTime} ms` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">
                      {row.responseTime !== null ? `${row.responseTime} ms` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">
                      {row.slices > 1 ? `${row.slices - 1} context switches` : '0 (continuous)'}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.isCompleted ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Terminated
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-[10px] italic">Ready</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isMultiQueue ? 11 : 10} className="py-8 text-center text-zinc-500">
                    No processes found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pageSize !== 'all' && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-zinc-400">
            <div>
              Showing <span className="font-semibold text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-white">
                {Math.min(currentPage * pageSize, sortedData.length)}
              </span>{' '}
              of <span className="font-semibold text-white">{sortedData.length}</span> processes
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-[11px] font-semibold text-zinc-400 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Visual Analytics Chart Card */}
      {simulationResult && (
        <div className="bg-zinc-950 rounded-xl border border-zinc-900 p-4 sm:p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-zinc-400" />
                Process Turnaround vs Waiting Time Distribution
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Comparative breakdown showing how scheduling decisions affected execution delay vs turnaround time.
              </p>
            </div>
          </div>

          <div className="w-full h-[260px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData.slice(0, 30)}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="id" stroke="#71717a" tickLine={false} axisLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <YAxis stroke="#71717a" tickLine={false} axisLine={false} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: '#27272a', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ fontWeight: '500', color: '#fafafa' }}
                />
                <Legend wrapperStyle={{ paddingTop: '5px', fontSize: '11px' }} iconType="circle" />
                <Bar dataKey="turnaroundTime" name="Turnaround Time (ms)" fill="#38bdf8" radius={[2, 2, 0, 0]} barSize={16} isAnimationActive={false} />
                <Bar dataKey="waitingTime" name="Waiting Time (ms)" fill="#fbbf24" radius={[2, 2, 0, 0]} barSize={16} isAnimationActive={false} />
                <Bar dataKey="responseTime" name="Response Time (ms)" fill="#34d399" radius={[2, 2, 0, 0]} barSize={16} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
