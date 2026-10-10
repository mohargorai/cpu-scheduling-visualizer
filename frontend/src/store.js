import { create } from 'zustand';

export const useStore = create((set) => ({
  processes: [
    { id: 'P1', arrivalTime: 0, burstTime: 5, priority: 2 },
    { id: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { id: 'P3', arrivalTime: 2, burstTime: 8, priority: 3 },
  ],
  algorithm: 'FCFS',
  config: { timeQuantum: 2, quanta: [2, 4, 8], agingThreshold: 10 },
  simulationResult: null,
  
  setProcesses: (processes) => set({ processes }),
  addProcess: (process) => set((state) => ({ processes: [...state.processes, process] })),
  removeProcess: (id) => set((state) => ({ processes: state.processes.filter(p => p.id !== id) })),
  setAlgorithm: (algorithm) => set({ algorithm }),
  setConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),
  setSimulationResult: (result) => set({ simulationResult: result }),
}));
