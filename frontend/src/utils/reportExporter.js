// frontend/src/utils/reportExporter.js
import { getProcessColor } from '../components/GanttChart';

/**
 * Generates a high-resolution, dark-themed executive PNG report 
 * using pure HTML5 Canvas with zero external dependencies.
 */
export function exportSimulationReport({
  algorithm = 'MLFQ',
  processes = [],
  simulationResult = null,
  title = 'CPU Scheduling & MLFQ Visualizer'
}) {
  if (!simulationResult || !simulationResult.trace) {
    alert('Please run the simulation first before exporting a report.');
    return;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // 2x Retina Resolution
  const width = 1400;
  const height = 980;
  canvas.width = width * 2;
  canvas.height = height * 2;
  ctx.scale(2, 2);

  // Background
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Header Bar
  ctx.fillStyle = '#18181b';
  ctx.fillRect(20, 20, width - 40, 80);
  ctx.strokeRect(20, 20, width - 40, 80);

  // Title & Subtitle
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(title, 45, 55);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  const dateStr = new Date().toLocaleString();
  ctx.fillText(`Algorithm: ${algorithm}  •  Workload: ${processes.length} Processes  •  Generated: ${dateStr}`, 45, 80);

  // Top 5 Executive Metric Cards
  const avg = simulationResult.averageMetrics || {};
  const maxTime = simulationResult.trace.length > 0 ? simulationResult.trace[simulationResult.trace.length - 1].endTime : 0;
  const throughput = maxTime > 0 ? (processes.length / maxTime).toFixed(3) : '0';

  const cards = [
    { label: 'AVG WAITING TIME', val: `${(avg.avgWT || 0).toFixed(2)} ms`, color: '#fbbf24' },
    { label: 'AVG TURNAROUND TIME', val: `${(avg.avgTAT || 0).toFixed(2)} ms`, color: '#38bdf8' },
    { label: 'CPU UTILIZATION', val: `${(avg.cpuUtilization || 0).toFixed(2)} %`, color: '#34d399' },
    { label: 'TOTAL MAKESPAN', val: `${maxTime} ms`, color: '#ffffff' },
    { label: 'THROUGHPUT', val: `${throughput} p/ms`, color: '#c084fc' },
  ];

  const cardWidth = (width - 80 - 40) / 5;
  cards.forEach((c, idx) => {
    const cx = 40 + idx * (cardWidth + 10);
    const cy = 125;
    ctx.fillStyle = '#18181b';
    ctx.fillRect(cx, cy, cardWidth, 75);
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, cardWidth, 75);

    ctx.fillStyle = '#71717a';
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.fillText(c.label, cx + 15, cy + 25);

    ctx.fillStyle = c.color;
    ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
    ctx.fillText(c.val, cx + 15, cy + 55);
  });

  // Section 1: Visual Execution Timeline (Gantt Chart)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  ctx.fillText('Execution Timeline (Gantt Chart)', 40, 235);

  const timelineX = 40;
  const timelineY = 250;
  const timelineW = width - 80;
  const timelineH = 140;

  ctx.fillStyle = '#111113';
  ctx.fillRect(timelineX, timelineY, timelineW, timelineH);
  ctx.strokeStyle = '#27272a';
  ctx.strokeRect(timelineX, timelineY, timelineW, timelineH);

  // Draw Gantt blocks
  const trace = simulationResult.trace || [];
  if (trace.length > 0 && maxTime > 0) {
    const blockY = timelineY + 30;
    const blockH = 50;
    const availableW = timelineW - 40;

    trace.forEach((slice) => {
      const bx = timelineX + 20 + (slice.startTime / maxTime) * availableW;
      const bw = Math.max(2, ((slice.endTime - slice.startTime) / maxTime) * availableW);
      const isIdle = slice.processId === 'IDLE';

      ctx.fillStyle = isIdle ? '#27272a' : getProcessColor(slice.processId);
      ctx.fillRect(bx, blockY, bw, blockH);
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, blockY, bw, blockH);

      // Label inside block if wide enough
      if (bw > 25) {
        ctx.fillStyle = isIdle ? '#a1a1aa' : '#000000';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isIdle ? 'IDLE' : slice.processId, bx + bw / 2, blockY + 30);
        ctx.textAlign = 'start';
      }
    });

    // Time axis ticks
    ctx.fillStyle = '#71717a';
    ctx.font = '10px monospace';
    const tickSteps = 10;
    for (let i = 0; i <= tickSteps; i++) {
      const tVal = Math.round((maxTime / tickSteps) * i);
      const tx = timelineX + 20 + (i / tickSteps) * availableW;
      ctx.fillText(`${tVal}ms`, tx - 12, blockY + blockH + 25);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(tx, blockY + blockH + 2, 1, 6);
      ctx.fillStyle = '#71717a';
    }
  }

  // Section 2: Individual Process Summary Table
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  ctx.fillText('Process Metrics Breakdown', 40, 430);

  const tableX = 40;
  const tableY = 445;
  const tableW = width - 80;
  const rowH = 26;

  // Header row
  ctx.fillStyle = '#18181b';
  ctx.fillRect(tableX, tableY, tableW, rowH);
  ctx.strokeStyle = '#27272a';
  ctx.strokeRect(tableX, tableY, tableW, rowH);

  const cols = [
    { name: 'Process ID', x: 20 },
    { name: 'Arrival', x: 140 },
    { name: 'Burst', x: 240 },
    { name: 'Priority', x: 340 },
    { name: 'Completion', x: 440 },
    { name: 'Turnaround Time', x: 570 },
    { name: 'Waiting Time', x: 730 },
    { name: 'Status', x: 890 }
  ];

  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  cols.forEach(c => ctx.fillText(c.name, tableX + c.x, tableY + 18));

  // Rows
  const metrics = simulationResult.metrics || [];
  const maxRows = Math.min(14, processes.length);
  const metricsMap = {};
  metrics.forEach(m => { metricsMap[m.id] = m; });

  for (let r = 0; r < maxRows; r++) {
    const p = processes[r];
    const m = metricsMap[p.id] || {};
    const ry = tableY + (r + 1) * rowH;

    ctx.fillStyle = r % 2 === 0 ? '#111113' : '#141416';
    ctx.fillRect(tableX, ry, tableW, rowH);
    ctx.strokeStyle = '#1f1f23';
    ctx.strokeRect(tableX, ry, tableW, rowH);

    ctx.font = '11px monospace';

    // Process ID with colored dot
    ctx.fillStyle = getProcessColor(p.id);
    ctx.beginPath();
    ctx.arc(tableX + cols[0].x + 4, ry + 13, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(p.id, tableX + cols[0].x + 16, ry + 17);

    ctx.fillStyle = '#d4d4d8';
    ctx.fillText(`${p.arrivalTime} ms`, tableX + cols[1].x, ry + 17);
    ctx.fillText(`${p.burstTime} ms`, tableX + cols[2].x, ry + 17);
    ctx.fillText(`P${p.priority || 1}`, tableX + cols[3].x, ry + 17);

    ctx.fillStyle = '#f4f4f5';
    ctx.fillText(m.completionTime !== undefined ? `${m.completionTime} ms` : '-', tableX + cols[4].x, ry + 17);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(m.turnaroundTime !== undefined ? `${m.turnaroundTime} ms` : '-', tableX + cols[5].x, ry + 17);

    ctx.fillStyle = '#fbbf24';
    ctx.fillText(m.waitingTime !== undefined ? `${m.waitingTime} ms` : '-', tableX + cols[6].x, ry + 17);

    ctx.fillStyle = '#34d399';
    ctx.fillText('Terminated', tableX + cols[7].x, ry + 17);
  }

  // Footer Note
  ctx.fillStyle = '#52525b';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText('Generated with CPU Scheduling & MLFQ Interactive Visualizer • Clean OS Simulation Engine', 45, height - 35);

  // Trigger Download
  const link = document.createElement('a');
  link.download = `cpu_scheduling_${algorithm.toLowerCase()}_executive_report.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
