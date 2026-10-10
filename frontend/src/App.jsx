import React, { useState } from 'react';
import axios from 'axios';
import { useStore } from './store';
import { GanttChart } from './components/GanttChart';
import { MetricsPanel } from './components/MetricsPanel';
import { ProcessInput } from './components/ProcessInput';
import { QueueVisualizer } from './components/QueueVisualizer';
import { Play, RotateCcw, Cpu, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { processes, algorithm, config, setSimulationResult, simulationResult } = useStore();
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    setSimulationResult(null); 
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.post(`${API_URL}/api/simulate`, {
        algorithm,
        processes,
        config
      });
      setTimeout(() => setSimulationResult(res.data), 150); 
    } catch (err) {
      console.error(err);
      alert("Simulation failed. Make sure backend is running.");
    }
    setLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen xl:h-screen w-full p-2 sm:p-4 flex flex-col font-sans selection:bg-zinc-800 text-zinc-100 bg-black xl:overflow-hidden box-border overflow-x-hidden">
      
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-none flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 mb-4 p-4 px-6 bg-zinc-950 rounded-xl border border-zinc-900 shadow-lg"
      >
        <div className="flex items-center gap-4 w-full sm:w-auto justify-start">
          <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800 hidden sm:block">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-tight">OS Simulator Pro</h1>
            <p className="text-zinc-500 font-medium text-xs mt-0.5">Interactive CPU Scheduling Visualizer</p>
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={runSimulation}
          disabled={loading || processes.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black font-bold py-2.5 px-6 rounded-lg transition-all disabled:opacity-50 hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        >
          {loading ? <RotateCcw className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          <span className="text-sm">{loading ? 'Simulating...' : 'Run Simulation'}</span>
        </motion.button>
      </motion.header>

      <div className="flex-1 flex flex-col xl:grid xl:grid-cols-12 gap-4 min-h-0 pb-4 xl:pb-0">
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-4 h-[550px] xl:h-full flex flex-col min-h-0"
        >
          <ProcessInput />
        </motion.div>

        <div className="xl:col-span-8 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            {simulationResult ? (
              <motion.div 
                key="results"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-4 h-full min-h-0"
              >
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 xl:flex-1 xl:min-h-0">
                  <motion.div variants={itemVariants} className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col h-[400px] xl:h-full min-h-0">
                    <h2 className="flex-none text-sm font-semibold mb-3 text-white flex items-center gap-2">
                      Execution Timeline
                    </h2>
                    <div className="flex-1 min-h-0">
                      <GanttChart trace={simulationResult.trace} />
                    </div>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col h-[400px] xl:h-full min-h-0">
                    <h2 className="flex-none text-sm font-semibold mb-3 text-white flex items-center gap-2">
                      Live Queues & States
                    </h2>
                    <div className="flex-1 min-h-0">
                      <QueueVisualizer trace={simulationResult.trace} processes={processes} />
                    </div>
                  </motion.div>
                </div>

                <motion.div variants={itemVariants} className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col h-[500px] xl:flex-[1.2] xl:min-h-0">
                  <h2 className="flex-none text-sm font-semibold mb-3 text-white flex items-center gap-2">
                    Comparative Analytics
                  </h2>
                  <div className="flex-1 min-h-0">
                    <MetricsPanel metrics={simulationResult.metrics} avg={simulationResult.averageMetrics} />
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="h-[400px] xl:h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-900 p-12 text-center"
              >
                <div className="p-6 bg-zinc-900 rounded-full mb-6 border border-zinc-800">
                  <Layers className="w-12 h-12 text-zinc-600" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-300 mb-3">Ready to Simulate</h2>
                <p className="text-sm max-w-sm mx-auto text-zinc-500">
                  Configure your processes on the left, select a scheduling algorithm, and click <strong className="text-white font-semibold">Run Simulation</strong>.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;
