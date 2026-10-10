// backend/src/simulator/priority.js

/**
 * Priority Scheduling Algorithm (Preemptive and Non-Preemptive)
 * 
 * OS Concept:
 * A priority number (integer) is associated with each process.
 * The CPU is allocated to the process with the highest priority (usually smallest integer).
 * Preemptive Priority will interrupt a lower priority process if a higher priority one arrives.
 * 
 * Problem:
 * Starvation of low priority processes.
 * 
 * Solution:
 * Aging - gradually increase the priority of processes that wait in the system for a long time.
 * (Will implement aging specifically in MLFQ, but can be added here if needed).
 */

function mergeContiguousTrace(trace) {
    if (trace.length === 0) return [];
    let merged = [trace[0]];
    for (let i = 1; i < trace.length; i++) {
        let last = merged[merged.length - 1];
        if (last.processId === trace[i].processId && last.endTime === trace[i].startTime) {
            last.endTime = trace[i].endTime;
        } else {
            merged.push(trace[i]);
        }
    }
    return merged;
}

function simulateNonPreemptivePriority(processes) {
    let remainingProcesses = processes.map(p => ({ ...p, completed: false }));
    let currentTime = 0;
    let trace = [];
    let metrics = [];
    let totalIdleTime = 0;
    
    let completedCount = 0;
    const n = processes.length;
    
    while (completedCount < n) {
        let available = remainingProcesses.filter(p => p.arrivalTime <= currentTime && !p.completed);
        
        if (available.length > 0) {
            // Sort by priority (smaller is higher), then by arrival time
            available.sort((a, b) => {
                if (a.priority === b.priority) return a.arrivalTime - b.arrivalTime;
                return a.priority - b.priority;
            });
            
            let p = available[0];
            let startTime = currentTime;
            let endTime = currentTime + p.burstTime;
            
            trace.push({
                processId: p.id,
                startTime,
                endTime
            });
            
            p.completed = true;
            completedCount++;
            
            let completionTime = endTime;
            let turnaroundTime = completionTime - p.arrivalTime;
            let waitingTime = turnaroundTime - p.burstTime;
            
            metrics.push({
                id: p.id,
                completionTime,
                turnaroundTime,
                waitingTime
            });
            
            currentTime = endTime;
        } else {
            let uncompleted = remainingProcesses.filter(p => !p.completed);
            uncompleted.sort((a, b) => a.arrivalTime - b.arrivalTime);
            let nextArrival = uncompleted[0].arrivalTime;
            
            trace.push({
                processId: 'IDLE',
                startTime: currentTime,
                endTime: nextArrival
            });
            
            totalIdleTime += (nextArrival - currentTime);
            currentTime = nextArrival;
        }
    }
    
    const totalTime = currentTime;
    const cpuUtilization = totalTime === 0 ? 0 : ((totalTime - totalIdleTime) / totalTime) * 100;
    
    const avgWT = metrics.reduce((acc, m) => acc + m.waitingTime, 0) / metrics.length;
    const avgTAT = metrics.reduce((acc, m) => acc + m.turnaroundTime, 0) / metrics.length;
    
    return {
        trace: mergeContiguousTrace(trace),
        metrics,
        averageMetrics: { avgWT, avgTAT, cpuUtilization }
    };
}

function simulatePreemptivePriority(processes) {
    let procs = processes.map(p => ({
        ...p,
        remainingTime: p.burstTime,
        completionTime: 0
    }));
    
    let currentTime = 0;
    let trace = [];
    let metrics = [];
    let totalIdleTime = 0;
    
    let completedCount = 0;
    const n = processes.length;
    
    let lastProcessId = null;
    let burstStart = 0;
    
    while (completedCount < n) {
        let available = procs.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);
        
        if (available.length > 0) {
            available.sort((a, b) => {
                if (a.priority === b.priority) return a.arrivalTime - b.arrivalTime;
                return a.priority - b.priority;
            });
            
            let p = available[0];
            
            if (lastProcessId !== p.id) {
                if (lastProcessId !== null) {
                    trace.push({
                        processId: lastProcessId,
                        startTime: burstStart,
                        endTime: currentTime
                    });
                }
                lastProcessId = p.id;
                burstStart = currentTime;
            }
            
            p.remainingTime -= 1;
            currentTime += 1;
            
            if (p.remainingTime === 0) {
                p.completionTime = currentTime;
                completedCount++;
                let turnaroundTime = p.completionTime - p.arrivalTime;
                let waitingTime = turnaroundTime - p.burstTime;
                
                metrics.push({
                    id: p.id,
                    completionTime: p.completionTime,
                    turnaroundTime,
                    waitingTime
                });
                
                trace.push({
                    processId: p.id,
                    startTime: burstStart,
                    endTime: currentTime
                });
                lastProcessId = null; 
            }
        } else {
            if (lastProcessId !== 'IDLE') {
                if (lastProcessId !== null) {
                    trace.push({
                        processId: lastProcessId,
                        startTime: burstStart,
                        endTime: currentTime
                    });
                }
                lastProcessId = 'IDLE';
                burstStart = currentTime;
            }
            totalIdleTime += 1;
            currentTime += 1;
        }
    }
    
    const totalTime = currentTime;
    const cpuUtilization = totalTime === 0 ? 0 : ((totalTime - totalIdleTime) / totalTime) * 100;
    
    const avgWT = metrics.reduce((acc, m) => acc + m.waitingTime, 0) / metrics.length;
    const avgTAT = metrics.reduce((acc, m) => acc + m.turnaroundTime, 0) / metrics.length;
    
    return {
        trace: mergeContiguousTrace(trace),
        metrics,
        averageMetrics: { avgWT, avgTAT, cpuUtilization }
    };
}

function simulatePriority(processes, preemptive = false) {
    if (preemptive) {
        return simulatePreemptivePriority(processes);
    } else {
        return simulateNonPreemptivePriority(processes);
    }
}

module.exports = { simulatePriority };
