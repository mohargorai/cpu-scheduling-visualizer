// backend/src/simulator/rr.js

/**
 * Round Robin (RR) Scheduling Algorithm
 * 
 * OS Concept:
 * Each process gets a small unit of CPU time (time quantum), usually 10-100 milliseconds.
 * After this time has elapsed, the process is preempted and added to the end of the ready queue.
 * 
 * Problem:
 * Performance depends heavily on the size of the time quantum. If too large, it degrades to FCFS.
 * If too small, context switching overhead becomes a dominant factor.
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

function simulateRR(processes, timeQuantum) {
    let procs = processes.map(p => ({
        ...p,
        remainingTime: p.burstTime,
        completionTime: 0
    }));
    
    // Sort initially by arrival time
    procs.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    let currentTime = 0;
    let trace = [];
    let metrics = [];
    let totalIdleTime = 0;
    
    let completedCount = 0;
    const n = processes.length;
    
    let readyQueue = [];
    let processIndex = 0; // Index for tracking which processes have arrived
    
    // Initial enqueue
    while (processIndex < n && procs[processIndex].arrivalTime <= currentTime) {
        readyQueue.push(procs[processIndex]);
        processIndex++;
    }
    
    let lastProcessId = null;
    let burstStart = 0;
    
    while (completedCount < n) {
        if (readyQueue.length > 0) {
            let p = readyQueue.shift();
            
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
            
            let executeTime = Math.min(p.remainingTime, timeQuantum);
            p.remainingTime -= executeTime;
            
            // Fast forward time by executeTime
            for (let t = 1; t <= executeTime; t++) {
                currentTime++;
                // Check if any new process arrived during this execution block
                while (processIndex < n && procs[processIndex].arrivalTime === currentTime) {
                    readyQueue.push(procs[processIndex]);
                    processIndex++;
                }
            }
            
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
            } else {
                // Preempted, put back in ready queue
                readyQueue.push(p);
                
                trace.push({
                    processId: p.id,
                    startTime: burstStart,
                    endTime: currentTime
                });
                lastProcessId = null;
            }
        } else {
            // Idle
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
            totalIdleTime++;
            currentTime++;
            
            // Check for arrivals
            while (processIndex < n && procs[processIndex].arrivalTime === currentTime) {
                readyQueue.push(procs[processIndex]);
                processIndex++;
            }
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

module.exports = { simulateRR };
