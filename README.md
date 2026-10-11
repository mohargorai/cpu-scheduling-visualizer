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

- **7 Supported Scheduling Algorithms:**
  - First-Come, First-Served (FCFS)
  - Shortest Job First (SJF - Non-Preemptive)
  - Shortest Remaining Time First (SRTF - Preemptive)
  - Round Robin (RR)
  - Priority Scheduling (Non-Preemptive)
  - Preemptive Priority Scheduling
  - Multi-Level Feedback Queue (MLFQ)
- **Live Interactive Visualization:**
  - Real-time seamless auto-run simulation: Change any parameter (algorithm, time quantum, add/remove process) and watch all charts update instantly without clicking "Run".
  - Interactive Queue Visualizer with a timeline scrubber to replay process execution state at any millisecond.
  - Dynamic playback speed controls (0.5x to 500x) with O(log N) binary search for ultra-fast scrubbing.
- **Comparative Analytics Dashboard:**
  - Automated calculation of Average Waiting Time, Turnaround Time, and CPU Utilization.
  - Individual Process Metrics visualized via responsive, paginated Bar Charts.
- **Mass-Scale Workload Handling:**
  - Import external datasets directly via `.csv` or `.json`.
  - Capable of running perfectly smooth simulations with 5,000+ concurrent processes.
  - Highly-optimized algorithms: Replaced O(N) DOM manipulations and string lookups with O(1) logic to prevent UI thread blocking.
- **Premium UI/UX:**
  - "Full Black" highly polished dark mode.
  - Infinite smooth pagination for timeline rendering and metrics, allowing smooth 60fps rendering of thousands of processes without browser crashes.
  - Fluid physics-based animations (Framer Motion) that elegantly handle UI state transitions.

## 🛠️ Technology Stack

- **Frontend:** React, Vite, Tailwind CSS v4, Zustand (State Management), Recharts (Data Visualization), Framer Motion (Animations), Lucide React (Icons).
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
2. Add incoming processes by specifying their Arrival Time, Burst Time, and Priority.
3. Select your desired Scheduling Algorithm from the dropdown (configure the Time Quantum if using RR or MLFQ).
4. Click **Run Simulation** to generate the trace logs, Gantt chart, and analytics dashboard!

## 🎓 Academic Concepts Covered
- **Context Switching Overhead** (Visualized via timeline gaps)
- **Starvation Avoidance / Aging** (Demonstrated in MLFQ and Priority queues)
- **Time Quantum Expiration** (Visible in Round Robin and MLFQ demotions)
- **Preemption** (Observable in SRTF and Preemptive Priority)
