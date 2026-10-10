import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { Plus, Trash2, Settings, Users, Activity, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const algorithms = ['FCFS', 'SJF', 'SRTF', 'RR', 'Priority', 'PreemptivePriority', 'MLFQ'];

export function ProcessInput() {
  const { processes, algorithm, config, setAlgorithm, setConfig, addProcess, removeProcess, setProcesses } = useStore();
  const [newProcess, setNewProcess] = useState({ arrivalTime: 0, burstTime: 5, priority: 1 });
  const fileInputRef = useRef(null);

  const handleAdd = () => {
    const id = `P${processes.length > 0 ? Math.max(...processes.map(p => parseInt(p.id.replace('P', '')) || 0)) + 1 : 1}`;
    addProcess({ id, ...newProcess });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        let newProcesses = [];

        if (file.name.endsWith('.json')) {
          newProcesses = JSON.parse(text);
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').filter(l => l.trim() !== '');
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            let p = {};
            headers.forEach((h, idx) => {
              if (h === 'id') p.id = values[idx].trim();
              else if (h === 'arrivaltime' || h === 'arrival_time') p.arrivalTime = parseInt(values[idx]);
              else if (h === 'bursttime' || h === 'burst_time') p.burstTime = parseInt(values[idx]);
              else if (h === 'priority') p.priority = parseInt(values[idx]);
            });
            if (p.id && p.burstTime !== undefined) newProcesses.push(p);
          }
        }

        if (newProcesses.length > 0) {
          useStore.getState().setProcesses(newProcesses);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          alert("Invalid dataset format. Ensure headers are: id, arrivalTime, burstTime, priority");
        }
      } catch (err) {
        alert("Failed to parse dataset: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-900 flex flex-col h-full min-h-0">
      <div className="flex-none mb-5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4 text-zinc-400" /> System Configuration
        </h2>
        
        <div className="space-y-3 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Scheduling Algorithm</label>
            <div className="relative">
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-white outline-none appearance-none font-medium transition-colors"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
              >
                {algorithms.map(alg => <option key={alg} value={alg}>{alg}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
          
          {(algorithm === 'RR' || algorithm === 'MLFQ') && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Time Quantum</label>
              <input 
                type="number" min="1" 
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-white outline-none font-medium transition-colors"
                value={config.timeQuantum}
                onChange={(e) => setConfig({ timeQuantum: parseInt(e.target.value) || 1 })}
              />
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-none flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" /> Process Queue
          </h2>
          {processes.length > 0 && (
            <button 
              onClick={() => setProcesses([])}
              className="text-[10px] uppercase tracking-wider font-semibold text-red-500/80 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto mb-4 pr-1 custom-scrollbar min-h-0">
          <AnimatePresence initial={false}>
            {processes.slice(0, 50).map(p => {
              const isLarge = processes.length > 50;
              const content = (
                <>
                  <div className="flex items-center gap-3">
                    <div className="bg-zinc-950 w-9 h-9 rounded flex items-center justify-center border border-zinc-800">
                      <span className="font-bold text-white text-xs">{p.id}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Arrival</span>
                        <span className="text-zinc-300 text-xs font-medium">{p.arrivalTime}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Burst</span>
                        <span className="text-zinc-300 text-xs font-medium">{p.burstTime}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Priority</span>
                        <span className="text-zinc-300 text-xs font-medium">{p.priority}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeProcess(p.id)}
                    className="text-zinc-600 hover:text-white p-1.5 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              );

              if (isLarge) {
                return (
                  <div key={p.id} className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80 flex items-center justify-between group hover:bg-zinc-900 transition-colors mb-2">
                    {content}
                  </div>
                );
              }

              return (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                  className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80 flex items-center justify-between group hover:bg-zinc-900 transition-colors"
                >
                  {content}
                </motion.div>
              );
            })}
            {processes.length > 50 && (
              <div className="text-center py-3 text-xs font-semibold text-zinc-500 uppercase tracking-widest bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800">
                + {processes.length - 50} more processes loaded
              </div>
            )}
          </AnimatePresence>
          {processes.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex flex-col items-center justify-center text-zinc-600 p-6 border border-dashed border-zinc-800 rounded-lg h-full min-h-[100px]"
            >
              <Activity className="w-5 h-5 mb-1.5 opacity-50" />
              <p className="text-xs font-medium">Empty Queue</p>
            </motion.div>
          )}
        </div>

        <div className="flex-none bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/80">
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">Arrival</label>
              <input type="number" min="0" value={newProcess.arrivalTime} onChange={e => setNewProcess({...newProcess, arrivalTime: parseInt(e.target.value)||0})} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded p-1.5 text-xs font-medium outline-none focus:border-zinc-600 transition-colors" />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">Burst</label>
              <input type="number" min="1" value={newProcess.burstTime} onChange={e => setNewProcess({...newProcess, burstTime: parseInt(e.target.value)||1})} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded p-1.5 text-xs font-medium outline-none focus:border-zinc-600 transition-colors" />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">Priority</label>
              <input type="number" min="1" value={newProcess.priority} onChange={e => setNewProcess({...newProcess, priority: parseInt(e.target.value)||1})} className="w-full bg-zinc-950 border border-zinc-800 text-white rounded p-1.5 text-xs font-medium outline-none focus:border-zinc-600 transition-colors" />
            </div>
          </div>
          
          <div className="flex gap-2">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdd} 
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 rounded transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Process
            </motion.button>
            <input 
              type="file" 
              accept=".json,.csv" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()} 
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 rounded transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <Upload className="w-3.5 h-3.5" /> Import Dataset
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
