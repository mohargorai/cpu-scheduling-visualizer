<div align="center">
  
  <h1><a href="https://os-simulator-fjco.onrender.com/" target="_blank">CPU Scheduling & MLFQ Visualizer</a></h1>

  <p><strong>An advanced, interactive web-based simulator designed to visualize Operating System CPU Scheduling algorithms.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  </p>
  
  <p>🎓 <strong>Academic Project:</strong> Developed as part of the Semester 5 Operating Systems Course.</p>
  <p>👥 <strong>Team Members:</strong> Mohar Gorai (24BIT0462) • Devkanti Sarkar (24BIT0162) • Agrima Gupta (24BIT0253)</p>

</div>

<br />

## 🚀 Features

- **8 Supported Scheduling Algorithms:**
  - First-Come, First-Served (FCFS)
  - Shortest Job First (SJF - Non-Preemptive)
  - Shortest Remaining Time First (SRTF - Preemptive)
  - Round Robin (RR)
  - Priority Scheduling (Non-Preemptive)
  - Preemptive Priority Scheduling
  - Multilevel Queue (MLQ - Priority Partitioned)
  - Multi-Level Feedback Queue (MLFQ - Dynamic Demotion & Aging)
- **Multi-Algorithm Comparison View (`#comparison`):**
  - Side-by-side benchmarking of any two scheduling algorithms simultaneously.
  - Performance delta badges showing percentage improvements/regressions in Average Turnaround Time, Waiting Time, CPU Utilization, and Total Makespan.
  - Synchronized dual Gantt chart execution timelines and comparative turnaround vs. waiting time bar charts.
- **Curated Educational Presets Modal:**
  - Six pre-configured standard OS benchmark scenarios: CPU Idle Gap (proves CPU Utilization < 100%), Convoy Effect (FCFS), SJF Optimal Makespan, Priority Inversion & Starvation, Round Robin Fair-Share Slicing, and MLFQ Dynamic Demotion & Aging.
- **Live Interactive Visualization & Dispatcher Decision Log:**
  - Real-time auto-run simulation: Updates all timelines and metrics instantly on parameter or process changes.
  - Interactive Queue Visualizer with a timeline scrubber to replay process execution state at any millisecond.
  - Real-time Dispatcher Decision Log recording dispatches, quantum expirations, queue demotions, aging promotions, idle states, and process completions with interactive click-to-scrub.
  - Playback Keyboard Shortcuts (`Space` to Play/Pause, `←`/`→` for 1ms stepping, `Home`/`End` for bounds, `R` to Reset).
  - Dynamic playback speed controls (0.5x to 500x) with O(log N) binary search for ultra-fast scrubbing.
  - Anti-jitter fixed queue architecture (`h-[62px]`, `.no-scrollbar`) eliminating layout resizing during live playback.
- **Dedicated Process Dashboard:**
  - Full-fidelity per-process telemetry table showing Arrival Time, Burst Time, Priority, Completion Time (CT), Turnaround Time (TAT), Waiting Time (WT), Response Time (RT), and Preemption Slices.
  - Interactive multi-column sorting and instant search filtering by Process ID.
  - One-click export to **CSV** and **JSON** for academic lab reports and experimental benchmarking.
  - Comparative Turnaround vs. Waiting vs. Response Time distribution chart.
- **High-Resolution 2x Retina PNG Report Exporter:**
  - Zero external dependency HTML5 canvas generator creating executive-ready summary report sheets with algorithm metadata, KPI summary cards, and individual process metrics.
- **Inline Process Queue Editing:**
  - In-place editing of Arrival, Burst, and Priority directly inside the Process Queue list with Enter/blur autosave.
- **Algorithm-Tailored Workload Engine:**
  - Single-click generator providing pedagogically calibrated 10-process workloads specifically tailored to expose each algorithm's mechanics.
- **Realistic CPU Utilization Computation:**
  - Real-world CPU Utilization formula accurately accounting for idle arrival gaps: $\frac{\text{Makespan} - \text{Total Idle}}{\text{Makespan}} \times 100\%$.
- **Mass-Scale Workload Handling:**
  - Import external datasets directly via `.csv` or `.json`.
  - Capable of running perfectly smooth simulations with 1,500+ concurrent processes.
  - O(1) ID tracking and consolidated trace intervals preventing browser UI thread blocking.
- **Premium UI/UX:**
  - Pure Black (`#000000`) high-contrast dark theme with curated minimal solid accent colors.
  - Three top-level navigation views: Visualizer, Process Dashboard, and Algorithm Comparison.
  - 100% responsive across mobile (375px+), tablet, and desktop viewports.

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite 6, Tailwind CSS v4, Zustand (State Management), Recharts (Data Visualization), Framer Motion (Animations), Lucide React (Icons).
- **Backend Simulation Engine:** Node.js, Express.
- **Architecture:** Purely functional simulator logic decoupled from the API layer for maximum testability.

## 📦 How to Run Locally

### 1. Start the Backend API
The backend simulation engine runs on port 5000.
```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend Application
The frontend runs on Vite's dev server (port 5173).
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage
1. Open your browser and navigate to `http://localhost:5173`.
2. Add incoming processes manually, click **Presets** to load standard educational scenarios (CPU Idle Gap, Convoy Effect, SJF, Starvation, MLFQ Demotion), or import a `.csv` / `.json` file.
3. Select your desired Scheduling Algorithm from the dropdown (configure the Time Quantum if using RR, MLQ, or MLFQ).
4. Click **Run Simulation** (or enjoy instant auto-run updates) to inspect the Gantt Chart, live Queue Visualizer, and Dispatcher Decision Log.
5. Click **Process Dashboard** in the header to view per-process telemetry, filter/sort metrics, and export data to CSV/JSON.
6. Click **Compare** in the header to run side-by-side comparative benchmarks between any two algorithms with performance delta indicators.
7. Click **Export PNG** in the header to generate a presentation-ready high-resolution summary report sheet.

## 🎓 Academic Concepts Covered
- **Convoy Effect** (Demonstrated in FCFS with long-burst processes blocking short jobs)
- **Context Switching Overhead** (Visualized via timeline switches and slice tracking)
- **Starvation Avoidance & Aging** (Demonstrated via MLFQ aging promotions back to Q0)
- **Time Quantum Expiration** (Visible in Round Robin and MLFQ demotions)
- **Preemption Mechanics** (Observable in SRTF, Preemptive Priority, and MLQ fixed-priority preemption)
- **Queue Partitioning** (Demonstrated in MLQ across static system, interactive, and batch tiers)

For deep architectural and algorithmic specifications, see [IMPLEMENTED.md](file:///c:/Users/mohar/OneDrive/Desktop/Interactive%20CPU%20Scheduling%20&%20Multi-Level%20Feedback%20Queue%20%28MLFQ%29%20Visualizer/IMPLEMENTED.md).

