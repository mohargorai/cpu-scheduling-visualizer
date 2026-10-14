// frontend/src/simulator/rr.js

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

export function simulateRR(processes, timeQuantum) {
    let procs = processes.map(p => ({
        ...p,
        remainingTime: p.burstTime,
        completionTime: 0
    }));
    
    procs.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    let currentTime = 0;
    let trace = [];
    let metrics = [];
    let totalIdleTime = 0;
    
    let completedCount = 0;
    const n = processes.length;
    
    let readyQueue = [];
    let processIndex = 0;
    
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
            
            for (let t = 1; t <= executeTime; t++) {
                currentTime++;
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
                readyQueue.push(p);
                
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
            totalIdleTime++;
            currentTime++;
            
            while (processIndex < n && procs[processIndex].arrivalTime === currentTime) {
                readyQueue.push(procs[processIndex]);
                processIndex++;
            }
        }
    }
    
    const totalTime = currentTime;
    const cpuUtilization = totalTime === 0 ? 0 : ((totalTime - totalIdleTime) / totalTime) * 100;
    
    const avgWT = metrics.length ? metrics.reduce((acc, m) => acc + m.waitingTime, 0) / metrics.length : 0;
    const avgTAT = metrics.length ? metrics.reduce((acc, m) => acc + m.turnaroundTime, 0) / metrics.length : 0;
    
    return {
        trace: mergeContiguousTrace(trace),
        metrics,
        averageMetrics: { avgWT, avgTAT, cpuUtilization }
    };
}
