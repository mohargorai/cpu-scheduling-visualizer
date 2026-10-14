// frontend/src/simulator/mlq.js

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

export function simulateMLQ(processes, quanta = [2, 4]) {
    const q0Quantum = quanta[0] || 2;
    const q1Quantum = quanta[1] || 4;

    let procs = processes.map(p => {
        let assignedQueue;
        if (p.queueLevel !== undefined && p.queueLevel !== null) {
            assignedQueue = Math.min(2, Math.max(0, Number(p.queueLevel) || 0));
        } else {
            const prio = Number(p.priority) || 0;
            if (prio <= 1) assignedQueue = 0;
            else if (prio === 2) assignedQueue = 1;
            else assignedQueue = 2;
        }

        return {
            ...p,
            remainingTime: p.burstTime,
            completionTime: 0,
            queueLevel: assignedQueue,
            timeInCurrentQuantum: 0
        };
    });

    procs.sort((a, b) => a.arrivalTime - b.arrivalTime);

    let queues = [[], [], []];

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
            queues: [
                queues[0].map(x => ({ id: x.id, remainingTime: x.remainingTime, priority: x.priority })),
                queues[1].map(x => ({ id: x.id, remainingTime: x.remainingTime, priority: x.priority })),
                queues[2].map(x => ({ id: x.id, remainingTime: x.remainingTime, priority: x.priority }))
            ],
            completed: completedProcs.map(x => x.id),
            event: eventMsg || ''
        });
    }

    while (processIndex < n && procs[processIndex].arrivalTime <= currentTime) {
        const p = procs[processIndex];
        queues[p.queueLevel].push(p);
        processIndex++;
    }

    let lastProcessId = null;
    let burstStart = 0;
    let currentQueueLevel = -1;

    while (completedCount < n) {
        let selectedQueueLevel = -1;
        for (let q = 0; q < 3; q++) {
            if (queues[q].length > 0) {
                selectedQueueLevel = q;
                break;
            }
        }

        if (selectedQueueLevel !== -1) {
            let p = queues[selectedQueueLevel].shift();
            
            let maxQuantum;
            if (selectedQueueLevel === 0) maxQuantum = q0Quantum;
            else if (selectedQueueLevel === 1) maxQuantum = q1Quantum;
            else maxQuantum = p.remainingTime;

            let executeLimit = Math.min(p.remainingTime, maxQuantum - p.timeInCurrentQuantum);

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

            let preemptedByHigherQueue = false;

            for (let t = 1; t <= executeLimit; t++) {
                recordSnapshot(
                    currentTime, 
                    p, 
                    selectedQueueLevel, 
                    `${p.id} executing in Queue ${selectedQueueLevel} (${p.remainingTime}ms remaining)`
                );

                currentTime++;
                p.remainingTime--;
                p.timeInCurrentQuantum++;

                while (processIndex < n && procs[processIndex].arrivalTime === currentTime) {
                    const arrivalProc = procs[processIndex];
                    queues[arrivalProc.queueLevel].push(arrivalProc);
                    processIndex++;
                }

                if (selectedQueueLevel > 0) {
                    let higherQueueHasProcess = false;
                    for (let hq = 0; hq < selectedQueueLevel; hq++) {
                        if (queues[hq].length > 0) {
                            higherQueueHasProcess = true;
                            break;
                        }
                    }
                    if (higherQueueHasProcess) {
                        preemptedByHigherQueue = true;
                        break;
                    }
                }

                if (p.remainingTime === 0) {
                    break;
                }
            }

            if (p.remainingTime === 0) {
                p.completionTime = currentTime;
                completedCount++;
                completedProcs.push({ id: p.id });

                const turnaroundTime = p.completionTime - p.arrivalTime;
                const waitingTime = turnaroundTime - p.burstTime;

                metrics.push({
                    id: p.id,
                    processId: p.id,
                    arrivalTime: p.arrivalTime,
                    burstTime: p.burstTime,
                    priority: p.priority,
                    completionTime: p.completionTime,
                    turnaroundTime,
                    waitingTime: Math.max(0, waitingTime),
                    queue: p.queueLevel
                });

                trace.push({
                    processId: p.id,
                    startTime: burstStart,
                    endTime: currentTime,
                    queue: selectedQueueLevel
                });
                lastProcessId = null;

            } else if (preemptedByHigherQueue) {
                queues[selectedQueueLevel].unshift(p);

                trace.push({
                    processId: p.id,
                    startTime: burstStart,
                    endTime: currentTime,
                    queue: selectedQueueLevel
                });
                lastProcessId = null;

            } else if (p.timeInCurrentQuantum >= maxQuantum) {
                p.timeInCurrentQuantum = 0;
                queues[selectedQueueLevel].push(p);

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
                const p = procs[processIndex];
                queues[p.queueLevel].push(p);
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
