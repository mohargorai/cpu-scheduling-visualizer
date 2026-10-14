// frontend/src/simulator/sjf.js

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

function simulateNonPreemptiveSJF(processes) {
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
            available.sort((a, b) => {
                if (a.burstTime === b.burstTime) return a.arrivalTime - b.arrivalTime;
                return a.burstTime - b.burstTime;
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
    
    const avgWT = metrics.length ? metrics.reduce((acc, m) => acc + m.waitingTime, 0) / metrics.length : 0;
    const avgTAT = metrics.length ? metrics.reduce((acc, m) => acc + m.turnaroundTime, 0) / metrics.length : 0;
    
    return {
        trace: mergeContiguousTrace(trace),
        metrics,
        averageMetrics: { avgWT, avgTAT, cpuUtilization }
    };
}

function simulateSRTF(processes) {
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
                if (a.remainingTime === b.remainingTime) return a.arrivalTime - b.arrivalTime;
                return a.remainingTime - b.remainingTime;
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
    
    const avgWT = metrics.length ? metrics.reduce((acc, m) => acc + m.waitingTime, 0) / metrics.length : 0;
    const avgTAT = metrics.length ? metrics.reduce((acc, m) => acc + m.turnaroundTime, 0) / metrics.length : 0;
    
    return {
        trace: mergeContiguousTrace(trace),
        metrics,
        averageMetrics: { avgWT, avgTAT, cpuUtilization }
    };
}

export function simulateSJF(processes, preemptive = false) {
    if (preemptive) {
        return simulateSRTF(processes);
    } else {
        return simulateNonPreemptiveSJF(processes);
    }
}
