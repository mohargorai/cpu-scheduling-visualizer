// backend/src/simulator/mlq.js

/**
 * Multilevel Queue (MLQ) CPU Scheduling Algorithm
 * 
 * OS Concept (Silberschatz):
 * The ready queue is partitioned into multiple separate, independent queues based on
 * process characteristics (e.g., priority, interactive vs. batch).
 * 
 * Key Principles of MLQ:
 * 1. Permanent Queue Assignment: Each process is permanently assigned to a specific queue
 *    based on its priority/type upon arrival (e.g. Priority <= 1 -> Q0, Priority 2 -> Q1, Priority >= 3 -> Q2).
 *    Processes NEVER move between queues (unlike MLFQ where processes demote/age).
 * 2. Independent Scheduling per Queue:
 *    - Queue 0 (System / Interactive): Round Robin with Time Quantum Q0 (default = timeQuantum).
 *    - Queue 1 (Interactive): Round Robin with Time Quantum Q1 (default = 2 * timeQuantum).
 *    - Queue 2 (Batch Processes): First-Come, First-Served (FCFS).
 * 3. Fixed-Priority Preemptive Scheduling between Queues:
 *    - No process in Queue 1 can run if Queue 0 is not empty.
 *    - No process in Queue 2 can run if Queue 0 or Queue 1 is not empty.
 *    - If a process arrives in a higher-priority queue while a lower-priority queue is executing,
 *      the lower-priority process is preempted immediately.
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
    const q0Quantum = Math.max(1, Number(quanta[0]) || 2);
    const q1Quantum = Math.max(1, Number(quanta[1]) || 4);

    // Map each process permanently to a queue based on priority
    // Priority <= 1 -> Queue 0 (RR q0)
    // Priority == 2 -> Queue 1 (RR q1)
    // Priority >= 3 -> Queue 2 (FCFS)
    const procs = processes.map(p => {
        let assignedQueue = 2;
        if (p.priority <= 1) {
            assignedQueue = 0;
        } else if (p.priority === 2) {
            assignedQueue = 1;
        } else {
            assignedQueue = 2;
        }

        return {
            ...p,
            remainingTime: p.burstTime,
            completionTime: 0,
            assignedQueue,
            timeInCurrentSlice: 0
        };
    });

    // Sort by arrival time
    procs.sort((a, b) => a.arrivalTime - b.arrivalTime);

    const queues = [[], [], []]; // Q0, Q1, Q2
    let currentTime = 0;
    let trace = [];
    let metrics = [];
    let totalIdleTime = 0;
    let completedCount = 0;
    const n = processes.length;
    let processIndex = 0;

    // Enqueue initial arrivals at T=0
    while (processIndex < n && procs[processIndex].arrivalTime <= currentTime) {
        const p = procs[processIndex];
        queues[p.assignedQueue].push(p);
        processIndex++;
    }

    let lastProcessId = null;
    let burstStart = 0;
    let currentQueueLevel = -1;

    while (completedCount < n) {
        // Find highest-priority non-empty queue
        let selectedQueue = -1;
        for (let q = 0; q < queues.length; q++) {
            if (queues[q].length > 0) {
                selectedQueue = q;
                break;
            }
        }

        if (selectedQueue !== -1) {
            const currentProcess = queues[selectedQueue][0];

            // If switching from idle or another process
            if (lastProcessId !== currentProcess.id) {
                if (lastProcessId !== null) {
                    trace.push({
                        processId: lastProcessId,
                        startTime: burstStart,
                        endTime: currentTime,
                        queue: currentQueueLevel
                    });
                }
                lastProcessId = currentProcess.id;
                burstStart = currentTime;
                currentQueueLevel = selectedQueue;
            }

            // Execute 1 tick
            currentProcess.remainingTime--;
            currentProcess.timeInCurrentSlice++;
            currentTime++;

            // Check for new arrivals at this new currentTime
            while (processIndex < n && procs[processIndex].arrivalTime <= currentTime) {
                const incoming = procs[processIndex];
                queues[incoming.assignedQueue].push(incoming);
                processIndex++;
            }

            // Check if current process completed
            if (currentProcess.remainingTime === 0) {
                currentProcess.completionTime = currentTime;
                queues[selectedQueue].shift(); // Remove completed process
                completedCount++;

                const turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
                const waitingTime = turnaroundTime - currentProcess.burstTime;

                metrics.push({
                    id: currentProcess.id,
                    arrivalTime: currentProcess.arrivalTime,
                    burstTime: currentProcess.burstTime,
                    priority: currentProcess.priority,
                    queue: currentProcess.assignedQueue,
                    completionTime: currentProcess.completionTime,
                    turnaroundTime,
                    waitingTime
                });
            } else {
                // Process is not finished yet. Check preemption conditions:
                
                // 1. Higher-priority queue preemption: Has any higher-priority queue received arrivals?
                let higherQueueHasProcesses = false;
                for (let q = 0; q < selectedQueue; q++) {
                    if (queues[q].length > 0) {
                        higherQueueHasProcesses = true;
                        break;
                    }
                }

                if (higherQueueHasProcesses) {
                    // Preempted by a higher priority queue!
                    // Reset timeInCurrentSlice for next turn, but do NOT demote
                    currentProcess.timeInCurrentSlice = 0;
                    // In RR queues, move to back or stay at head? Keep at head so it resumes immediately when higher queue clears
                    // (already at head of queues[selectedQueue])
                } else if (selectedQueue === 0 && currentProcess.timeInCurrentSlice >= q0Quantum) {
                    // Quantum expired in Queue 0 (RR)
                    currentProcess.timeInCurrentSlice = 0;
                    queues[0].shift();
                    queues[0].push(currentProcess); // Rotate to back of Queue 0 (NO feedback/demotion!)
                } else if (selectedQueue === 1 && currentProcess.timeInCurrentSlice >= q1Quantum) {
                    // Quantum expired in Queue 1 (RR)
                    currentProcess.timeInCurrentSlice = 0;
                    queues[1].shift();
                    queues[1].push(currentProcess); // Rotate to back of Queue 1 (NO feedback/demotion!)
                }
                // Queue 2 is FCFS: runs until termination or preemption by higher queues
            }
        } else {
            // CPU is idle
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

            totalIdleTime++;
            currentTime++;

            // Check for new arrivals during idle tick
            while (processIndex < n && procs[processIndex].arrivalTime <= currentTime) {
                const incoming = procs[processIndex];
                queues[incoming.assignedQueue].push(incoming);
                processIndex++;
            }
        }
    }

    // Push final segment
    if (lastProcessId !== null) {
        trace.push({
            processId: lastProcessId,
            startTime: burstStart,
            endTime: currentTime,
            queue: currentQueueLevel
        });
    }

    const totalTime = currentTime;
    const cpuUtilization = totalTime === 0 ? 0 : ((totalTime - totalIdleTime) / totalTime) * 100;

    const avgWT = metrics.length === 0 ? 0 : metrics.reduce((acc, m) => acc + m.waitingTime, 0) / metrics.length;
    const avgTAT = metrics.length === 0 ? 0 : metrics.reduce((acc, m) => acc + m.turnaroundTime, 0) / metrics.length;

    // Sort metrics by original process order or ID
    metrics.sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, '')) || 0;
        const idB = parseInt(b.id.replace(/\D/g, '')) || 0;
        return idA - idB;
    });

    return {
        trace: mergeContiguousTrace(trace),
        metrics,
        averageMetrics: { avgWT, avgTAT, cpuUtilization }
    };
}

module.exports = { simulateMLQ };
