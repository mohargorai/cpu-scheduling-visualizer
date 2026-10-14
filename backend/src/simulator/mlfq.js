// backend/src/simulator/mlfq.js

/**
 * Multi-Level Feedback Queue (MLFQ) Scheduling Algorithm
 * 
 * OS Concept:
 * Complex algorithm that separates processes into multiple queues based on their CPU burst behavior.
 * Processes move between queues based on execution history (e.g., if a process uses too much CPU, it moves to a lower priority queue).
 * Aging is used to prevent starvation (processes in lower queues for too long get promoted).
 */

function mergeContiguousTrace(trace) {
    if (trace.length === 0) return [];
    let merged = [trace[0]];
    for (let i = 1; i < trace.length; i++) {
        let last = merged[merged.length - 1];
        if (last.processId === trace[i].processId && last.endTime === trace[i].startTime && last.queue === trace[i].queue) {
            last.endTime = trace[i].endTime;
        } else {
            merged.push(trace[i]);
        }
    }
    return merged;
}

function simulateMLFQ(processes, quanta = [2, 4, 8], agingThreshold = 10) {
    // We will simulate 3 queues by default, with quanta Q0, Q1, Q2.
    // The lowest priority queue (Queue 2) uses Round Robin with large quantum or FCFS (we will use RR with Q2).
    let procs = processes.map(p => ({
        ...p,
        remainingTime: p.burstTime,
        completionTime: 0,
        queueLevel: 0, // Starts at highest priority queue (0)
        timeInCurrentQueue: 0,
        lastExecutedTime: p.arrivalTime // To calculate waiting time for aging
    }));
    
    procs.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    let queues = Array(quanta.length).fill().map(() => []);
    
    let currentTime = 0;
    let trace = [];
    let metrics = [];
    let totalIdleTime = 0;
    
    let completedCount = 0;
    const n = processes.length;
    let processIndex = 0;
    let completedProcs = [];
    let queueSnapshots = [];

    function recordSnapshot(t, cpuProc, queueLvl, eventMsg) {
        if (queueSnapshots.length > 2500) return;
        queueSnapshots.push({
            time: t,
            cpu: cpuProc ? { id: cpuProc.id, queue: queueLvl, remainingTime: cpuProc.remainingTime, priority: cpuProc.priority } : null,
            queues: queues.map(q => q.map(x => ({ id: x.id, remainingTime: x.remainingTime, priority: x.priority }))),
            completed: completedProcs.map(x => x.id),
            event: eventMsg || ''
        });
    }
    
    // Initial arrivals
    while (processIndex < n && procs[processIndex].arrivalTime <= currentTime) {
        queues[0].push(procs[processIndex]);
        processIndex++;
    }
    
    let lastProcessId = null;
    let burstStart = 0;
    let currentQueueLevel = -1;
    
    while (completedCount < n) {
        // AGING: Promote processes that have waited too long in lower queues
        for (let q = 1; q < queues.length; q++) {
            let i = 0;
            while (i < queues[q].length) {
                let p = queues[q][i];
                if ((currentTime - p.lastExecutedTime) >= agingThreshold) {
                    p.queueLevel = 0;
                    p.timeInCurrentQueue = 0;
                    queues[0].push(p);
                    queues[q].splice(i, 1);
                } else {
                    i++;
                }
            }
        }
        
        // Find the highest priority non-empty queue
        let selectedQueueLevel = -1;
        for (let q = 0; q < queues.length; q++) {
            if (queues[q].length > 0) {
                selectedQueueLevel = q;
                break;
            }
        }
        
        if (selectedQueueLevel !== -1) {
            let p = queues[selectedQueueLevel].shift();
            let currentQuantum = quanta[selectedQueueLevel];
            
            if (lastProcessId !== p.id || currentQueueLevel !== selectedQueueLevel) {
                if (lastProcessId !== null) {
                    trace.push({
                        processId: lastProcessId,
                        startTime: burstStart,
                        endTime: currentTime,
                        queue: currentQueueLevel
                    });
                }
                lastProcessId = p.id;
                burstStart = currentTime;
                currentQueueLevel = selectedQueueLevel;
            }
            
            // Execute for up to time quantum or remaining time
            let executeTime = Math.min(p.remainingTime, currentQuantum - p.timeInCurrentQueue);
            
            // We simulate preemptive nature within the time slice by advancing time step-by-step
            // to check if a higher priority process arrives.
            let actualExecuted = 0;
            let preemptedByHigherQueue = false;
            
            for (let t = 1; t <= executeTime; t++) {
                recordSnapshot(
                    currentTime,
                    p,
                    selectedQueueLevel,
                    `${p.id} running in Queue ${selectedQueueLevel} (${p.remainingTime}ms remaining)`
                );

                currentTime++;
                actualExecuted++;
                p.remainingTime--;
                p.timeInCurrentQueue++;
                
                // Check arrivals
                while (processIndex < n && procs[processIndex].arrivalTime === currentTime) {
                    queues[0].push(procs[processIndex]);
                    processIndex++;
                }
                
                // If a new process arrived in Q0 and we are in Q1 or Q2, we should preempt immediately
                if (selectedQueueLevel > 0 && queues[0].length > 0) {
                    preemptedByHigherQueue = true;
                    break;
                }
            }
            
            p.lastExecutedTime = currentTime; // Reset wait time for aging
            
            if (p.remainingTime === 0) {
                p.completionTime = currentTime;
                completedCount++;
                completedProcs.push({ id: p.id });
                
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
                    endTime: currentTime,
                    queue: selectedQueueLevel
                });
                lastProcessId = null;
                currentQueueLevel = -1;
            } else if (preemptedByHigherQueue) {
                // Preempted by arrival of higher priority process, but hasn't finished quantum yet
                queues[selectedQueueLevel].unshift(p);
                trace.push({
                    processId: p.id,
                    startTime: burstStart,
                    endTime: currentTime,
                    queue: selectedQueueLevel
                });
                lastProcessId = null;
            } else if (p.timeInCurrentQueue >= currentQuantum) {
                // Time quantum expired, demote to lower queue if possible
                if (selectedQueueLevel < queues.length - 1) {
                    p.queueLevel = selectedQueueLevel + 1;
                }
                p.timeInCurrentQueue = 0; // Reset for next queue
                queues[p.queueLevel].push(p);
                
                trace.push({
                    processId: p.id,
                    startTime: burstStart,
                    endTime: currentTime,
                    queue: selectedQueueLevel
                });
                lastProcessId = null;
            } else {
                // This shouldn't happen based on the logic above, but for safety:
                queues[selectedQueueLevel].push(p);
            }
            
        } else {
            // IDLE
            if (lastProcessId !== 'IDLE') {
                if (lastProcessId !== null) {
                    trace.push({
                        processId: lastProcessId,
                        startTime: burstStart,
                        endTime: currentTime,
                        queue: currentQueueLevel
                    });
                }
                lastProcessId = 'IDLE';
                burstStart = currentTime;
                currentQueueLevel = -1;
            }
            recordSnapshot(currentTime, null, -1, 'CPU Idle - waiting for process arrivals');
            totalIdleTime++;
            currentTime++;
            
            while (processIndex < n && procs[processIndex].arrivalTime === currentTime) {
                queues[0].push(procs[processIndex]);
                processIndex++;
            }
        }
    }
    
    // Final completion snapshot
    recordSnapshot(currentTime, null, -1, 'All processes completed execution');

    const totalTime = currentTime;
    const cpuUtilization = totalTime === 0 ? 0 : ((totalTime - totalIdleTime) / totalTime) * 100;
    
    const avgWT = metrics.reduce((acc, m) => acc + m.waitingTime, 0) / metrics.length;
    const avgTAT = metrics.reduce((acc, m) => acc + m.turnaroundTime, 0) / metrics.length;
    
    return {
        trace: mergeContiguousTrace(trace),
        metrics,
        averageMetrics: { avgWT, avgTAT, cpuUtilization },
        queueSnapshots
    };
}

module.exports = { simulateMLFQ };
