// frontend/src/simulator/index.js
import { simulateFCFS } from './fcfs.js';
import { simulateSJF } from './sjf.js';
import { simulateRR } from './rr.js';
import { simulatePriority } from './priority.js';
import { simulateMLQ } from './mlq.js';
import { simulateMLFQ } from './mlfq.js';

export function runSimulationEngine({ algorithm, processes, config }) {
    if (!Array.isArray(processes) || processes.length === 0) {
        return null;
    }

    // Sanitize processes identical to backend server
    const sanitizedProcesses = processes.map(p => ({
        id: String(p.id).substring(0, 50),
        arrivalTime: Math.max(0, Number(p.arrivalTime) || 0),
        burstTime: Math.max(1, Number(p.burstTime) || 1),
        priority: Number(p.priority) || 0
    }));

    switch (algorithm) {
        case 'FCFS': 
            return simulateFCFS(sanitizedProcesses);
        case 'SJF': 
            return simulateSJF(sanitizedProcesses, false);
        case 'SRTF': 
            return simulateSJF(sanitizedProcesses, true);
        case 'RR': 
            return simulateRR(sanitizedProcesses, config?.timeQuantum || 2);
        case 'Priority': 
            return simulatePriority(sanitizedProcesses, false);
        case 'PreemptivePriority': 
        case 'Preemptive Priority':
            return simulatePriority(sanitizedProcesses, true);
        case 'MLFQ': 
            return simulateMLFQ(sanitizedProcesses, config?.quanta || [2, 4, 8], config?.agingThreshold || 10);
        case 'MLQ': 
            return simulateMLQ(sanitizedProcesses, config?.quanta || [2, 4]);
        default: 
            throw new Error(`Unknown algorithm: ${algorithm}`);
    }
}
