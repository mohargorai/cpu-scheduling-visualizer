// frontend/src/simulator/mlfq.js

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

export function simulateMLFQ(processes, quanta = [2, 4, 8], agingThreshold = 10) {
    let procs = processes.map(p => ({
        ...p,
        remainingTime: p.burstTime,
        completionTime: 0,
        queueLevel: 0,
        timeInCurrentQueue: 0,
        lastExecutedTime: p.arrivalTime
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
        
        // Find highest priority non-empty queue
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
            
            let executeTime = Math.min(p.remainingTime, currentQuantum - p.timeInCurrentQueue);
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
                
                while (processIndex < n && procs[processIndex].arrivalTime === currentTime) {
                    queues[0].push(procs[processIndex]);
                    processIndex++;
                }
                
                if (selectedQueueLevel > 0 && queues[0].length > 0) {
                    preemptedByHigherQueue = true;
                    break;
                }
            }
            
            p.lastExecutedTime = currentTime;
            
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
                queues[selectedQueueLevel].unshift(p);
                trace.push({
                    processId: p.id,
                    startTime: burstStart,
                    endTime: currentTime,
                    queue: selectedQueueLevel
                });
                lastProcessId = null;
            } else if (p.timeInCurrentQueue >= currentQuantum) {
                if (selectedQueueLevel < queues.length - 1) {
                    p.queueLevel = selectedQueueLevel + 1;
                }
                p.timeInCurrentQueue = 0;
                queues[p.queueLevel].push(p);
                
                trace.push({
                    processId: p.id,
                    startTime: burstStart,
                    endTime: currentTime,
                    queue: selectedQueueLevel
                });
                lastProcessId = null;
            } else {
                queues[selectedQueueLevel].push(p);
            }
            
        } else {
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
    
    recordSnapshot(currentTime, null, -1, 'All processes completed execution');

    const totalTime = currentTime;
    const cpuUtilization = totalTime === 0 ? 0 : ((totalTime - totalIdleTime) / totalTime) * 100;
    
    const avgWT = metrics.length ? metrics.reduce((acc, m) => acc + m.waitingTime, 0) / metrics.length : 0;
    const avgTAT = metrics.length ? metrics.reduce((acc, m) => acc + m.turnaroundTime, 0) / metrics.length : 0;
    
    return {
        trace: mergeContiguousTrace(trace),
        metrics,
        averageMetrics: { avgWT, avgTAT, cpuUtilization },
        queueSnapshots
    };
}
