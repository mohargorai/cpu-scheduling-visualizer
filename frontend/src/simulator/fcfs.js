// frontend/src/simulator/fcfs.js

export function simulateFCFS(processes) {
    let readyQueue = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    let currentTime = 0;
    let trace = [];
    let metrics = [];
    let totalIdleTime = 0;
    
    for (let p of readyQueue) {
        if (currentTime < p.arrivalTime) {
            trace.push({
                processId: 'IDLE',
                startTime: currentTime,
                endTime: p.arrivalTime
            });
            totalIdleTime += (p.arrivalTime - currentTime);
            currentTime = p.arrivalTime;
        }
        
        let startTime = currentTime;
        let endTime = currentTime + p.burstTime;
        
        trace.push({
            processId: p.id,
            startTime,
            endTime
        });
        
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
    }
    
    const totalTime = currentTime;
    const cpuUtilization = totalTime === 0 ? 0 : ((totalTime - totalIdleTime) / totalTime) * 100;
    
    const avgWT = metrics.length ? metrics.reduce((acc, m) => acc + m.waitingTime, 0) / metrics.length : 0;
    const avgTAT = metrics.length ? metrics.reduce((acc, m) => acc + m.turnaroundTime, 0) / metrics.length : 0;
    
    return {
        trace,
        metrics,
        averageMetrics: {
            avgWT,
            avgTAT,
            cpuUtilization
        }
    };
}
