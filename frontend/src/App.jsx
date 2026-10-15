import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from './store';
import { GanttChart } from './components/GanttChart';
import { MetricsPanel } from './components/MetricsPanel';
import { ProcessInput } from './components/ProcessInput';
import { QueueVisualizer } from './components/QueueVisualizer';
import { ProcessDashboard } from './components/ProcessDashboard';
import { AlgorithmComparison } from './components/AlgorithmComparison';
import { Play, Loader2, Layers, LayoutGrid, TableProperties, Scale, Download, Share2, Check, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportSimulationReport } from './utils/reportExporter';
import { runSimulationEngine } from './simulator';

function App() {
  const { processes, algorithm, config, setSimulationResult, simulationResult, setProcesses, setAlgorithm, setConfig } = useStore();
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    if (window.location.hash === '#dashboard') return 'dashboard';
    if (window.location.hash === '#comparison') return 'comparison';
    return 'visualizer';
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#dashboard') {
        setActiveTab('dashboard');
      } else if (window.location.hash === '#comparison') {
        setActiveTab('comparison');
      } else {
        setActiveTab('visualizer');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Auto-load shared scenario from URL parameters
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlAlgo = params.get('algo');
      const urlProcs = params.get('procs');
      const urlTq = params.get('tq');
      const urlQuanta = params.get('quanta');
      const urlAging = params.get('aging');

      if (urlAlgo) {
        setAlgorithm(urlAlgo);
      }
      if (urlTq || urlQuanta || urlAging) {
        setConfig({
          ...(urlTq ? { timeQuantum: parseInt(urlTq) || 2 } : {}),
          ...(urlQuanta ? { quanta: urlQuanta.split(',').map(Number) } : {}),
          ...(urlAging ? { agingThreshold: parseInt(urlAging) || 10 } : {}),
        });
      }
      if (urlProcs) {
        const parsed = urlProcs.split(',').map(item => {
          const parts = item.split(':');
          return {
            id: parts[0] || 'P1',
            arrivalTime: Math.max(0, parseInt(parts[1]) || 0),
            burstTime: Math.max(1, parseInt(parts[2]) || 1),
            priority: parseInt(parts[3]) || 1
          };
        }).filter(p => p.id && p.burstTime > 0);

        if (parsed.length > 0) {
          setProcesses(parsed);
          setShareNotice(`Loaded shared ${urlAlgo || 'CPU'} scenario (${parsed.length} processes)`);
          setTimeout(() => setShareNotice(''), 4500);
        }
      }
    } catch (e) {
      console.warn("Failed to parse URL simulation parameters:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShareSimulation = () => {
    if (processes.length === 0) return;
    try {
      const params = new URLSearchParams();
      params.set('algo', algorithm);
      const procStr = processes.map(p => `${p.id}:${p.arrivalTime}:${p.burstTime}:${p.priority || 1}`).join(',');
      params.set('procs', procStr);

      if (config?.timeQuantum) params.set('tq', config.timeQuantum);
      if (config?.quanta) params.set('quanta', config.quanta.join(','));
      if (config?.agingThreshold) params.set('aging', config.agingThreshold);

      const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}${window.location.hash || ''}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'dashboard') {
      window.location.hash = 'dashboard';
    } else if (tab === 'comparison') {
      window.location.hash = 'comparison';
    } else {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  };

  useEffect(() => {
    if (simulationResult) {
      if (processes.length > 0) {
        runSimulation();
      } else {
        setSimulationResult(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processes, algorithm, config]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      let data = null;

      // 1. If backend URL is specified or on localhost, attempt API request with 2.5s timeout
      const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');
      if (API_URL) {
        try {
          const res = await axios.post(`${API_URL}/api/simulate`, {
            algorithm,
            processes,
            config
          }, { timeout: 2500 });
          if (res?.data?.trace) {
            data = res.data;
          }
        } catch (apiErr) {
          console.warn("Backend API unreachable, using client simulation engine:", apiErr.message);
        }
      }

      // 2. If no backend response (e.g. Render static site or offline), run directly via client simulation engine
      if (!data) {
        data = runSimulationEngine({ algorithm, processes, config });
      }

      if (!simulationResult) {
        setTimeout(() => {
          setSimulationResult(data);
          setLoading(false);
        }, 300); 
      } else {
        setSimulationResult(data);
        setLoading(false);
      }
    } catch (err) {
      console.error("Simulation failed:", err);
      alert("Simulation failed: " + err.message);
      setLoading(false);
    }
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
    <div className="min-h-screen w-full p-3 sm:p-6 flex flex-col font-sans selection:bg-zinc-800 text-zinc-100 bg-black box-border">
      
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-none flex flex-col md:flex-row items-center justify-between gap-4 mb-5 p-4 px-6 bg-zinc-950 rounded-xl border border-zinc-900 shadow-lg"
      >
        <div className="flex items-center gap-4 w-full md:w-auto justify-start">
          <div className="w-10 h-10 p-1 bg-zinc-900 rounded-lg border border-zinc-800 hidden sm:flex items-center justify-center shadow-inner">
            <img src="/favicon.svg" alt="CPU Scheduling Logo" className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-tight">CPU Scheduling & MLFQ Visualizer</h1>
            <p className="text-zinc-500 font-medium text-xs mt-0.5">Interactive Process Dispatch & Execution Simulator</p>
          </div>
        </div>

        {/* View Switcher: Visualizer vs Process Analytics Dashboard vs Algorithm Comparison */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900/90 rounded-lg border border-zinc-800">
          <button
            onClick={() => switchTab('visualizer')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'visualizer'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Visualizer</span>
          </button>
          
          <button
            onClick={() => switchTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span>Process Dashboard</span>
            {processes.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                activeTab === 'dashboard' ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-zinc-300'
              }`}>
                {processes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => switchTab('comparison')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'comparison'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Compare</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {processes.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShareSimulation}
              className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 font-semibold py-2 px-3 rounded-lg text-xs transition-colors shadow-sm"
              title="Copy shareable link with current workload and algorithm"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Share Link</span>
                </>
              )}
            </motion.button>
          )}

          {simulationResult && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => exportSimulationReport({ algorithm, processes, simulationResult })}
              className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 font-semibold py-2 px-3.5 rounded-lg text-xs transition-colors shadow-sm"
              title="Export high-resolution PNG summary report"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Export PNG</span>
            </motion.button>
          )}

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={runSimulation}
            disabled={loading || processes.length === 0}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black font-bold py-2 px-5 rounded-lg transition-all disabled:opacity-50 shadow-sm"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span className="text-xs">{loading ? 'Simulating...' : 'Run Simulation'}</span>
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'comparison' ? (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="flex-1 w-full"
          >
            <AlgorithmComparison />
          </motion.div>
        ) : activeTab === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="flex-1 w-full"
          >
            <ProcessDashboard onRunSimulation={runSimulation} loading={loading} />
          </motion.div>
        ) : (
          <motion.div
            key="visualizer"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col xl:grid xl:grid-cols-12 gap-5 pb-6 items-stretch"
          >
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="xl:col-span-4 flex flex-col h-full min-h-0"
            >
              <ProcessInput />
            </motion.div>

            <div className="xl:col-span-8 flex flex-col min-h-0 h-full flex-1">
              <AnimatePresence mode="wait">
                {simulationResult ? (
                  <motion.div 
                    key="results"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="flex flex-col gap-5 h-full flex-1"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                      <motion.div variants={itemVariants} className="bg-zinc-950 p-4 sm:p-5 rounded-xl border border-zinc-900 flex flex-col min-h-[480px]">
                        <h2 className="flex-none text-sm font-semibold mb-3 text-white flex items-center gap-2">
                          Execution Timeline
                        </h2>
                        <div className="flex-1 min-h-[420px] flex flex-col">
                          <GanttChart trace={simulationResult.trace} />
                        </div>
                      </motion.div>
                      
                      <motion.div variants={itemVariants} className="bg-zinc-950 p-4 sm:p-5 rounded-xl border border-zinc-900 flex flex-col min-h-[480px]">
                        <h2 className="flex-none text-sm font-semibold mb-3 text-white flex items-center gap-2">
                          Live Queues & States
                        </h2>
                        <div className="flex-1 flex flex-col">
                          <QueueVisualizer 
                            trace={simulationResult.trace} 
                            processes={processes} 
                            algorithm={algorithm}
                            simulationResult={simulationResult}
                          />
                        </div>
                      </motion.div>
                    </div>

                    <motion.div variants={itemVariants} className="bg-zinc-950 p-4 sm:p-5 rounded-xl border border-zinc-900 flex flex-col flex-1 min-h-[300px]">
                      <div className="flex-none flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                          Comparative Analytics
                        </h2>
                        <button
                          onClick={() => switchTab('dashboard')}
                          className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 group"
                        >
                          <span>Open Full Process Dashboard</span>
                          <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                        </button>
                      </div>
                      <div className="flex-1 min-h-0">
                        <MetricsPanel 
                          metrics={simulationResult.metrics} 
                          avg={simulationResult.averageMetrics} 
                          trace={simulationResult.trace}
                          onOpenDashboard={() => switchTab('dashboard')}
                        />
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
                    className="h-[400px] xl:h-full min-h-[500px] flex flex-col items-center justify-center text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-900 p-12 text-center"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Shared Scenario Notice */}
      <AnimatePresence>
        {shareNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-50 bg-emerald-950/95 border border-emerald-500/40 text-emerald-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs flex items-center gap-2.5 backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{shareNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
