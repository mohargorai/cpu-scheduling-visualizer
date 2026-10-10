# OS Simulator Pro: Interactive CPU Scheduling & MLFQ Visualizer

An advanced, interactive web-based simulator designed to visualize Operating System CPU Scheduling algorithms. 

> **🎓 Academic Project:** Developed as part of the Semester 5 Operating Systems Course.

This project provides a dynamic, animated environment to understand how different scheduling policies affect process execution, waiting times, and CPU utilization.

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
  - Real-time Gantt Chart generation.
  - Interactive Queue Visualizer with a timeline scrubber to replay process execution state at any millisecond.
- **Comparative Analytics Dashboard:**
  - Automated calculation of Average Waiting Time and Turnaround Time.
  - Individual Process Metrics visualized via responsive Bar Charts.
- **Mass-Scale Workload Handling:**
  - Import external datasets directly via `.csv` or `.json`.
  - Capable of running perfectly smooth simulations with 800+ concurrent processes.
- **Premium UI/UX:**
  - "Full Black" highly polished dark mode.
  - Interactive minimap (Brush slider) and infinitely scrollable timeline rendering for handling hundreds of processes without lag.
  - Fluid physics-based animations (Framer Motion) that intelligently degrade to raw HTML when queue sizes scale massively.

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
