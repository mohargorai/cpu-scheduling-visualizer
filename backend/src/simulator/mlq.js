// backend/src/simulator/mlq.js

/**
 * Multilevel Queue (MLQ) CPU Scheduling Algorithm
 * 
 * OS Concept:
 * The ready queue is partitioned into separate queues, each with its own scheduling algorithm.
 * Processes are permanently assigned to one queue based on their priority or attributes (unlike MLFQ,
 * processes do NOT move between queues).
 * 
 * Standard textbook model:
 * - Queue 0 (System / High Priority): Round Robin with Quantum Q0 (default 2)
 * - Queue 1 (Interactive / Medium Priority): Round Robin with Quantum Q1 (default 4)
 * - Queue 2 (Batch / Low Priority): First-Come, First-Served (FCFS)
 * 
 * Scheduling among queues: Fixed priority preemptive scheduling.
 * Queue 0 has absolute priority over Queue 1, which has absolute priority over Queue 2.
 * If a process arrives in a higher queue, any executing process in a lower queue is preempted immediately.
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

function simulateMLQ(processes, quanta = [2, 4]) {
    const q0Quantum = quanta[0] || 2;
    const q1Quantum = quanta[1] || 4;

    // Permanently assign each process to a queue based on priority or explicit queueLevel
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

    // 3 Fixed Queues: Q0 (RR), Q1 (RR), Q2 (FCFS)
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

    // Initial arrivals
    while (processIndex < n && procs[processIndex].arrivalTime <= currentTime) {
        const p = procs[processIndex];
        queues[p.queueLevel].push(p);
        processIndex++;
    }

    let lastProcessId = null;
    let burstStart = 0;
    let currentQueueLevel = -1;

    while (completedCount < n) {
        // Find highest priority non-empty queue (Fixed Priority: 0 > 1 > 2)
        let selectedQueueLevel = -1;
        for (let q = 0; q < 3; q++) {
            if (queues[q].length > 0) {
                selectedQueueLevel = q;
                break;
            }
        }

        if (selectedQueueLevel !== -1) {
            let p = queues[selectedQueueLevel].shift();
            
            // Determine max time slice for this queue
            let maxQuantum;
            if (selectedQueueLevel === 0) maxQuantum = q0Quantum;
            else if (selectedQueueLevel === 1) maxQuantum = q1Quantum;
            else maxQuantum = p.remainingTime; // Queue 2 is FCFS: runs until finished or preempted

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

            // Execute step-by-step to handle preemption when new higher-priority processes arrive
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

                // Check new arrivals at current tick
                while (processIndex < n && procs[processIndex].arrivalTime === currentTime) {
                    const arrivalProc = procs[processIndex];
                    queues[arrivalProc.queueLevel].push(arrivalProc);
                    processIndex++;
                }

                // Preempt if any higher-priority queue received a process
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
                // Process terminated
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
                // Preempted by a higher queue: put at front of its own queue to resume when higher queues clear
                queues[selectedQueueLevel].unshift(p);

                trace.push({
                    processId: p.id,
                    startTime: burstStart,
                    endTime: currentTime,
                    queue: selectedQueueLevel
                });
                lastProcessId = null;

            } else if (p.timeInCurrentQuantum >= maxQuantum) {
                // Time quantum expired in RR queue (Queue 0 or 1): reset quantum counter, rotate to back of SAME queue
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
                // General fallback
                queues[selectedQueueLevel].push(p);
            }

        } else {
            // CPU is IDLE
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

    // Final completion snapshot
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

module.exports = { simulateMLQ };
