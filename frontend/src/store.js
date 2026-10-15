import { create } from 'zustand';

export const useStore = create((set) => ({
  processes: [],
  algorithm: 'FCFS',
  config: { timeQuantum: 2, quanta: [2, 4, 8], agingThreshold: 10 },
  simulationResult: null,
  seekTime: null,
  
  setProcesses: (processes) => set({ processes }),
  addProcess: (process) => set((state) => ({ processes: [...state.processes, process] })),
  removeProcess: (id) => set((state) => ({ processes: state.processes.filter(p => p.id !== id) })),
  updateProcess: (id, updatedFields) => set((state) => ({
    processes: state.processes.map(p => p.id === id ? { ...p, ...updatedFields } : p)
  })),
  setAlgorithm: (algorithm) => set({ algorithm }),
  setConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),
  setSimulationResult: (result) => set({ simulationResult: result }),
  setSeekTime: (time) => set({ seekTime: time }),
}));
