# CPU Scheduling & MLFQ Visualizer — Implementation Documentation
  
**Project:** CPU Scheduling & Multi-Level Feedback Queue (MLFQ) Visualizer  
**Target Environment:** Node.js, Express, React, Vite, Tailwind CSS  
**Repository:** [github.com/mohargorai/cpu-scheduling-visualizer](https://github.com/mohargorai/cpu-scheduling-visualizer)  
**Project Team:**
- **Mohar Gorai** (24BIT0462)
- **Devkanti Sarkar** (24BIT0162)
- **Agrima Gupta** (24BIT0253)

---

## 1. Executive Overview & System Architecture

The **CPU Scheduling & MLFQ Visualizer** is a high-performance, full-stack educational and analytical application designed to simulate, visualize, and benchmark Operating System process scheduling algorithms.

The application follows a decoupled client-server architecture:
- **Simulation Engine (Backend):** A pure algorithmic simulation pipeline written in Node.js/Express. It accepts process parameters, runs discrete-event scheduling cycles, handles context switches, and computes metrics (Waiting Time, Turnaround Time, CPU Utilization, and execution traces).
- **Visualization & Playback Engine (Frontend):** A reactive React single-page application powered by Vite, Zustand, and Framer Motion. It supports interactive timeline playback, multilevel queue inspections, and charts.

```
+---------------------------------------------------------------------------------+
|                                 FRONTEND (React)                                |
|  +-------------------+  +--------------------+  +----------------------------+  |
|  |   ProcessInput    |  |  QueueVisualizer   |  |   GanttChart & Metrics     |  |
|  | - Manual / CSV    |  | - Playback Engine  |  | - 100/page Pagination      |  |
|  | - Workload Presets|  | - O(log N) Scrubber|  | - Recharts KPI Analytics   |  |
|  +---------+---------+  +---------^----------+  +-------------^--------------+  |
|            |                      |                           |                 |
|            +-------------------+  |  +------------------------+                 |
|                                |  |  |                                          |
|                                v  |  v                                          |
|                       +--------------------+                                    |
|                       | Zustand State Store|                                    |
|                       +---------+----------+                                    |
+---------------------------------|-----------------------------------------------+
                                  | HTTP REST API (/api/simulate)
                                  v
+---------------------------------------------------------------------------------+
|                                 BACKEND (Node.js)                               |
|  +---------------------------------------------------------------------------+  |
|  | Express Router + DoS & Sanitization Middleware (Max 1,500 procs per batch)|  |
|  +-------------------------------------+-------------------------------------+  |
|                                        |                                        |
|              +-------------------------+-------------------------+              |
|              |                         |                         |              |
|              v                         v                         v              |
|   +---------------------+   +---------------------+   +---------------------+   |
|   | Single-Queue Engine |   | Multilevel Queue MLQ|   | Multi-Level Feedback|   |
|   | - FCFS, SJF, SRTF   |   | - Static Partition  |   |   Queue (MLFQ)      |   |
|   | - Round Robin (RR)  |   | - Fixed Preemption  |   | - Dynamic Demotion  |   |
|   | - Priority Sched    |   | - Q0/Q1(RR), Q2(FCFS|   | - Starvation Aging  |   |
|   +---------------------+   +---------------------+   +---------------------+   |
|              |                         |                         |              |
|              +-------------------------+-------------------------+              |
|                                        v                                        |
|         +-------------------------------------------------------------+         |
|         | Pure In-Memory Discrete Event Simulation (Zero DB Overhead) |         |
|         +-------------------------------------------------------------+         |
+---------------------------------------------------------------------------------+
```

---

## 2. Standard Unilevel CPU Scheduling Algorithms

### 2.1 First-Come, First-Served (FCFS)
- **Class:** Non-Preemptive
- **Concept:** Processes are dispatched strictly in order of their `arrivalTime`.
- **Implementation:**
  - Sorts processes by arrival time.
  - Maintains `currentTime`. If CPU is idle, fast-forwards to next arrival.
  - Generates trace block: `[currentTime, currentTime + burstTime]`.
- **Characteristics:** Subject to the Convoy Effect (short processes waiting behind very long ones).

### 2.2 Shortest Job First (SJF — Non-Preemptive)
- **Class:** Non-Preemptive
- **Concept:** Among all arrived processes in the ready queue, the process with the smallest initial `burstTime` is selected.
- **Implementation:**
  - Evaluates ready queue at each process completion.
  - Selects minimum burst process: $\min(burstTime)$.
  - Executes completely to termination before selecting the next process.

### 2.3 Shortest Remaining Time First (SRTF — Preemptive SJF)
- **Class:** Preemptive
- **Concept:** The CPU continuously allocates cycles to the process with the shortest remaining burst time. If a newly arrived process requires less time than the running process, preemption occurs.
- **Implementation:**
  - Discrete millisecond-by-millisecond clock iteration.
  - At each tick, new arrivals are added to ready candidates.
  - Selects process where `remainingTime > 0` is minimal.
  - Records contiguous intervals and context switches.

### 2.4 Round Robin (RR)
- **Class:** Preemptive
- **Concept:** Each process receives a fixed time slice ($Q$) in cyclic order.
- **Implementation:**
  - Uses an explicit FIFO ready queue (`queue = []`).
  - Processes arriving during current quantum are enqueued before the preempted process is requeued.
  - Configurable Time Quantum (default $Q = 2$).

### 2.5 Priority Scheduling (Preemptive & Non-Preemptive)
- **Class:** Configurable (Preemptive / Non-Preemptive)
- **Concept:** Processes execute according to numerical priority ($0$ is highest priority).
- **Implementation:**
  - **Non-Preemptive:** Once dispatched, runs until burst completion.
  - **Preemptive:** Dispatched process is immediately preempted if a higher priority process arrives.

---

## 3. Advanced Multi-Queue Scheduling Engines (MLQ & MLFQ)

Unlike unilevel schedulers that manage a single ready queue, modern operating systems partition processes across hierarchical queue tiers. The simulator implements both major multi-queue paradigms with full live visualizer support.

### 3.1 Multilevel Queue (MLQ) Engine
- **Class:** Preemptive Partitioned Multi-Queue
- **Concept:** The ready queue is partitioned into permanently separated priority queues based on intrinsic process attributes (Priority / Classification). Unlike MLFQ, processes **never migrate or demote** across queues.

#### Visual Architecture & Execution Flow:
```
[ Incoming Processes ]
         │
         ├──► Priority <= 1  ──► [ Queue 0: Round Robin (Q=2) ] ──┐ (Highest Priority)
         │                                                        │
         ├──► Priority == 2  ──► [ Queue 1: Round Robin (Q=4) ] ──┼──► [ CPU Core ]
         │                                                        │    (Fixed-Priority Preemption)
         └──► Priority >= 3  ──► [ Queue 2: FCFS (Batch Load) ] ──┘ (Lowest Priority)

* KEY MECHANISM: Processes remain permanently in their assigned queue.
  If a higher-priority queue becomes non-empty, any executing process
  in a lower queue is preempted immediately and returned to its queue.
```

- **Queue Structure:**
  - **Queue 0 ($Q_0$ - System / High Priority, Priority $\le$ 1):** Round Robin with Time Quantum $Q_0 = 2$.
  - **Queue 1 ($Q_1$ - Interactive / Medium Priority, Priority = 2):** Round Robin with Time Quantum $Q_1 = 4$.
  - **Queue 2 ($Q_2$ - Batch / Low Priority, Priority $\ge$ 3):** First-Come, First-Served (FCFS).
- **Inter-Queue Scheduling:** Fixed priority preemptive scheduling ($Q_0 > Q_1 > Q_2$).

---

### 3.2 Multi-Level Feedback Queue (MLFQ) Engine
- **Class:** Preemptive, Adaptive Feedback Multi-Queue
- **Concept:** Separates processes into multiple priority queues according to runtime CPU behavior and dynamically adjusts priority:

#### Visual Architecture & Execution Flow:
```
[ All Incoming Processes ] ──► Enter at Highest Priority Level
                                         │
                                         ▼
                   ┌──────────► [ Queue 0 (Q = 2) ] ──► Finished? ──► [ Terminated ]
                   │                     │
                   │               Quantum Expired (Demote)
                   │                     ▼
                   │            [ Queue 1 (Q = 4) ] ──► Finished? ──► [ Terminated ]
             Aging Boost                 │
        (Wait >= 10 ticks)         Quantum Expired (Demote)
                   │                     ▼
                   └─────────── [ Queue 2 (Q = 8 / FCFS) ] ──► Finished? ──► [ Terminated ]

* KEY MECHANISM: Processes dynamically migrate between queues based on CPU burst history.
  CPU-bound jobs descend to lower tiers, while starved jobs are promoted via aging.
```

- **Queue Structure:**
  - **Queue 0 ($Q_0$):** Highest priority. Runs Round Robin with time quantum $Q = 2$.
  - **Queue 1 ($Q_1$):** Medium priority. Runs Round Robin with time quantum $Q = 4$.
  - **Queue 2 ($Q_2$):** Lowest priority. Runs Round Robin with time quantum $Q = 8$ (or FCFS fallback).
- **Rule Set Implemented:**
  1. If $\text{Priority}(A) > \text{Priority}(B)$, $A$ runs ($B$ waits).
  2. If $\text{Priority}(A) == \text{Priority}(B)$, $A$ and $B$ run via Round Robin with the queue's quantum.
  3. When a process enters the system, it is placed at highest priority ($Q_0$).
  4. Once a process uses its time allotment at a given level, it is demoted down by 1 level ($Q_0 \to Q_1 \to Q_2$).
  5. **Starvation Prevention (Aging):** If a process waits in a lower queue for $\ge \text{agingThreshold}$ (default 10 units), it is automatically promoted back to $Q_0$.

---

### 3.3 Live Multi-Queue Visualizer Engine (`QueueVisualizer.jsx`)

The system does not merely present static Gantt charts and analytical graphs; it features a real-time, interactive **Multi-Level Queue Visual Engine** showing step-by-step queue dynamics:

1. **Three Visual Queue Tracks ($Q_0, Q_1, Q_2$):**
   - Renders live horizontal tracks showing all processes currently waiting in each individual queue tier.
   - Each waiting process is shown as an animated card with its ID and remaining burst time.
2. **CPU Execution Core 0:**
   - Visual hardware slot showing the currently executing process, remaining burst, and a live badge indicating the origin queue tier it was dispatched from.
   - Pulsing execution ring and status indicator.
3. **Inter-Queue Dynamics Indicators:**
   - For **MLFQ**: Visual indicators showing dynamic quantum timeout demotion ($\downarrow$) and aging starvation promotion ($\uparrow$).
   - For **MLQ**: Visual partition badges showing static priority isolation.
4. **Interactive Timeline Scrubbing & Event Activity Banner:**
   - Play/Pause, Step-Backward, and Step-Forward controls allowing users to step millisecond by millisecond through queue migrations and preemption events.
   - Live activity banner describing exact scheduler events at time $T$ (e.g. `P1 running in Queue 0`, `P1 demoted to Queue 1 after exhausting quantum`, `All processes completed`).
5. **Terminated Process Tray:**
   - Displays finished processes in completed state.

---

## 4. Mathematical Metrics & Formulas

For every process $P_i$ with arrival time $A_i$ and burst time $B_i$:

$$\text{Turnaround Time (TAT)}_i = \text{Completion Time (CT)}_i - \text{Arrival Time (A)}_i$$

$$\text{Waiting Time (WT)}_i = \text{Turnaround Time (TAT)}_i - \text{Burst Time (B)}_i$$

$$\text{Response Time (RT)}_i = \text{Time of First CPU Dispatch}_i - \text{Arrival Time (A)}_i$$

$$\text{Average Turnaround Time} = \frac{1}{N} \sum_{i=1}^{N} \text{TAT}_i$$

$$\text{Average Waiting Time} = \frac{1}{N} \sum_{i=1}^{N} \text{WT}_i$$

$$\text{Average Response Time} = \frac{1}{N} \sum_{i=1}^{N} \text{RT}_i$$

$$\text{CPU Utilization (\%)} = \left( \frac{\text{Total Simulation Time} - \text{Total Idle Time}}{\text{Total Simulation Time}} \right) \times 100\%$$

$$\text{Throughput} = \frac{\text{Completed Processes}}{\text{Total Simulation Makespan}}$$

---

## 5. Frontend Implementation & Components

| Component | File Path | Responsibilities & Implementations |
| :--- | :--- | :--- |
| **App Layout & Orchestrator** | `frontend/src/App.jsx` | Houses the top navigation, simulation triggers, auto-run state management, tri-tab routing (Visualizer vs. Process Dashboard vs. Algorithm Comparison), and responsive shell. |
| **Process Input & Workload** | `frontend/src/components/ProcessInput.jsx` | - Manual process addition with Enter-key auto-submission.<br>- In-place inline editing of Arrival, Burst, and Priority directly in the process queue.<br>- Fast backspacing numeric fields.<br>- Dropdown with full academic names & abbreviations.<br>- CSV / JSON bulk file importer.<br>- **Curated Educational Presets Modal:** Six standard OS scenarios (CPU Idle Gap, Convoy Effect, SJF Optimal, Starvation, RR Fair-Share, MLFQ Aging).<br>- **Algorithm-Tailored Workload Engine:** Generates calibrated 10-process workloads specifically configured to trigger each algorithm's edge cases. |
| **Interactive Queue Visualizer** | `frontend/src/components/QueueVisualizer.jsx` | - Real-time step-by-step playback with Play/Pause and single-step scrubbing.<br>- **Live Dispatcher Decision Log:** Chronological audit trail of all dispatches, quantum expirations, demotions, aging promotions, idle states, and terminations.<br>- **Keyboard Controls:** `Space` (Play/Pause), `←`/`→` (1ms step), `Home`/`End` (Bounds), `R` (Reset).<br>- O(log N) binary search scrubber.<br>- Multi-speed playback rates (0.5x, 1x, 2x, 5x, 10x, 50x, 100x, 500x).<br>- Dynamic display of CPU slot and Q0, Q1, Q2 multilevel queues.<br>- **Anti-Jitter Geometry:** Pixel-locked height constraints (`h-[62px]`, `.no-scrollbar`) eliminating layout jumps during playback. |
| **Multi-Algorithm Comparison** | `frontend/src/components/AlgorithmComparison.jsx` | - Side-by-side simultaneous simulation of any two algorithms.<br>- Percentage delta indicator pills for TAT, WT, CPU Utilization, and Total Makespan.<br>- Dual synchronized Gantt execution timelines.<br>- Comparative Turnaround and Waiting time Recharts bar chart.<br>- One-click high-resolution comparative report export. |
| **High-Resolution Report Exporter** | `frontend/src/utils/reportExporter.js` | - Pure HTML5 2x Retina canvas exporter with zero external dependencies.<br>- Generates executive-ready summary report PNGs with metadata, KPI cards, and process tables. |
| **Gantt Timeline Chart** | `frontend/src/components/GanttChart.jsx` | - Color-coded execution blocks with process IDs and durations.<br>- Context switch and idle markers.<br>- 15 blocks/page pagination to eliminate layout thrashing.<br>- Hardware-accelerated static SVG rendering (`isAnimationActive={false}`) for 60fps playback. |
| **Comparative Analytics** | `frontend/src/components/MetricsPanel.jsx` | - 5 KPI overview cards (Avg WT, Avg TAT, CPU Util %, Makespan, Throughput).<br>- Recharts bar chart for turnaround vs. waiting time.<br>- Paginated process detail table (30 items/page). |
| **Process Analytics Dashboard** | `frontend/src/components/ProcessDashboard.jsx` | - Dedicated full-fidelity telemetry table with per-process CT, TAT, WT, RT, and preemption slice counts.<br>- Instant multi-column sorting & real-time ID search filtering.<br>- One-click export to CSV & JSON for research benchmarking.<br>- Recharts comparative Turnaround vs. Waiting vs. Response time distribution graph. |
| **Zustand State Store** | `frontend/src/store.js` | Centralized reactive store managing process list, selected algorithm, quantum configs, inline process updates, and simulation results. |

---

## 6. Performance Engineering & Optimizations

1. **O(1) Incremental ID Generation:** Replaced $O(N)$ regex scanning of process IDs with a tracking counter, enabling instantaneous additions even when 1,500+ processes are loaded.
2. **O(log N) Timeline State Scrubbing:** Implemented binary search over execution trace intervals for instant timeline seek times at 60fps.
3. **Trace Merging Algorithm:** A single-pass contiguous trace consolidation algorithm merges adjacent slices of the same process, reducing memory overhead and Gantt DOM node count by up to 80%.
4. **Anti-Jitter Geometry & Scrollbar Stabilization:**
   - Enforced strict fixed container heights on queue cards (`h-[62px]`, tracks `h-[32px]`), CPU slot (`min-h-[190px]`), and terminated tray (`h-[40px]`).
   - Integrated `.no-scrollbar` styling (`scrollbar-width: none; &::-webkit-scrollbar: hidden`) to prevent OS-native 14px scrollbar popping in and out when processes enter or leave queues.
5. **Recharts Render Pipeline Streamlining:**
   - Disabled heavy 800ms Recharts SVG animation cascades during live playback (`isAnimationActive={false}`) to eliminate frame drops and UI stutter.
   - Removed 240-fps `requestAnimationFrame` loops in favor of lightweight direct telemetry rendering.
6. **DOM Virtualization & Pagination:**
   - Gantt Chart paginated to 15 blocks per page.
   - Metrics Table paginated to 30 rows per page.
   - Process Dashboard paginated to configurable 10/25/50/100/All items per page.
7. **API Security & DoS Protection:**
   - Strict payload validation on `POST /api/simulate`.
   - Max 1,500 processes per batch to prevent server thread blocking.
   - Strict numerical sanitization preventing NoSQL injection and invalid inputs.

---

## 7. Complete Technology Stack & Tools Used

### 7.1 Frontend
- **React 18:** Modern declarative UI library using functional hooks.
- **Vite 6:** Ultra-fast ES module development server and Rollup production bundler.
- **Tailwind CSS v4:** Utility-first modern CSS framework for responsive dark theme design.
- **Zustand:** Lightweight, performant state management without boilerplate.
- **Framer Motion:** Spring physics animations for UI transitions.
- **Recharts:** Composable SVG charting library for metrics visualization.
- **Lucide React:** Clean icon system.

### 7.2 Backend & Data Layer
- **Node.js (v24):** Event-driven server runtime environment.
- **Express.js:** Minimalist REST API web framework.
- **Architecture:** 100% In-Memory Simulation Pipeline (Zero database overhead, high throughput).

### 7.3 Tooling & Build Environment
- **Git & GitHub:** Distributed version control and remote deployment tracking.

