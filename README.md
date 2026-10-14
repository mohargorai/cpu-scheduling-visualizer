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
- **Live Interactive Visualization:**
  - Real-time seamless auto-run simulation: Change any parameter (algorithm, time quantum, add/remove process) and watch all charts update instantly without manual re-triggers.
  - Interactive Queue Visualizer with a timeline scrubber to replay process execution state at any millisecond.
  - Dynamic playback speed controls (0.5x to 500x) with O(log N) binary search for ultra-fast scrubbing.
  - Anti-jitter fixed queue architecture (`h-[62px]`, `.no-scrollbar`) eliminating layout resizing during live playback.
- **Dedicated Process Dashboard:**
  - Full-fidelity per-process telemetry table showing Arrival Time, Burst Time, Priority, Completion Time (CT), Turnaround Time (TAT), Waiting Time (WT), Response Time (RT), and Preemption Slices.
  - Interactive multi-column sorting and instant search filtering by Process ID.
  - One-click export to **CSV** and **JSON** for academic lab reports and experimental benchmarking.
  - Comparative Turnaround vs. Waiting vs. Response Time distribution chart.
- **Algorithm-Tailored Workload Engine:**
  - Single-click generator providing pedagogically calibrated 10-process workloads specifically tailored to expose each algorithm's mechanics (e.g., Convoy Effect in FCFS, quantum slicing in RR, preemption in SRTF, multi-tier partitioning in MLQ, demotion and aging in MLFQ).
- **Comparative Analytics Dashboard:**
  - Automated calculation of Average Waiting Time, Turnaround Time, Response Time, Total Makespan, System Throughput, and CPU Utilization.
  - Individual Process Metrics visualized via responsive, paginated Bar Charts.
- **Mass-Scale Workload Handling:**
  - Import external datasets directly via `.csv` or `.json`.
  - Capable of running perfectly smooth simulations with 1,500+ concurrent processes.
  - O(1) ID tracking and consolidated trace intervals preventing browser UI thread blocking.
- **Premium UI/UX:**
  - "Full Black" high-contrast dark mode tailored for technical presentations.
  - Symmetrical dual-column layout with synchronized bottom alignment.
  - Independent horizontal scroll containers for wide tables ensuring 100% responsiveness on mobile (375px+), tablet, and desktop viewports.

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
2. Add incoming processes manually, load an **Algorithm-Tailored Workload**, or import a `.csv` / `.json` file.
3. Select your desired Scheduling Algorithm from the dropdown (configure the Time Quantum if using RR, MLQ, or MLFQ).
4. Click **Run Simulation** (or enjoy instant auto-run updates) to inspect the Gantt Chart and live Queue Visualizer.
5. Click **Process Dashboard** in the header to view per-process telemetry, filter/sort metrics, and export data to CSV/JSON.

## 🎓 Academic Concepts Covered
- **Convoy Effect** (Demonstrated in FCFS with long-burst processes blocking short jobs)
- **Context Switching Overhead** (Visualized via timeline switches and slice tracking)
- **Starvation Avoidance & Aging** (Demonstrated via MLFQ aging promotions back to Q0)
- **Time Quantum Expiration** (Visible in Round Robin and MLFQ demotions)
- **Preemption Mechanics** (Observable in SRTF, Preemptive Priority, and MLQ fixed-priority preemption)
- **Queue Partitioning** (Demonstrated in MLQ across static system, interactive, and batch tiers)

For deep architectural and algorithmic specifications, see [IMPLEMENTED.md](file:///c:/Users/mohar/OneDrive/Desktop/Interactive%20CPU%20Scheduling%20&%20Multi-Level%20Feedback%20Queue%20%28MLFQ%29%20Visualizer/IMPLEMENTED.md).

