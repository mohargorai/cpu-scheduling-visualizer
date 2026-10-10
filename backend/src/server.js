const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { simulateFCFS } = require('./simulator/fcfs');
const { simulateSJF } = require('./simulator/sjf');
const { simulateRR } = require('./simulator/rr');
const { simulatePriority } = require('./simulator/priority');
const { simulateMLFQ } = require('./simulator/mlfq');
const SimulationLog = require('./models/SimulationLog');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection is optional so the MVP runs easily
mongoose.connect('mongodb://localhost:27017/os-simulator')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB connection failed (Running without DB). Start MongoDB if you want to save logs.'));

app.post('/api/simulate', async (req, res) => {
    try {
        const { algorithm, processes, config } = req.body;
        
        // --- SECURITY & DoS PROTECTION ---
        if (!Array.isArray(processes)) {
            return res.status(400).json({ error: 'Invalid payload: processes must be an array' });
        }
        if (processes.length > 1500) {
            return res.status(413).json({ error: 'Payload too large: Max 1500 processes allowed per simulation to prevent server overload.' });
        }
        
        // Sanitize inputs to ensure they are strictly numbers (Prevents NoSQL Injection / Type attacks)
        const sanitizedProcesses = processes.map(p => ({
            id: String(p.id).substring(0, 50),
            arrivalTime: Math.max(0, Number(p.arrivalTime) || 0),
            burstTime: Math.max(1, Number(p.burstTime) || 1),
            priority: Number(p.priority) || 0
        }));
        // ---------------------------------

        let result;

        switch (algorithm) {
            case 'FCFS': result = simulateFCFS(sanitizedProcesses); break;
            case 'SJF': result = simulateSJF(sanitizedProcesses, false); break;
            case 'SRTF': result = simulateSJF(sanitizedProcesses, true); break;
            case 'RR': result = simulateRR(sanitizedProcesses, config?.timeQuantum || 2); break;
            case 'Priority': result = simulatePriority(sanitizedProcesses, false); break;
            case 'PreemptivePriority': result = simulatePriority(sanitizedProcesses, true); break;
            case 'MLFQ': result = simulateMLFQ(sanitizedProcesses, config?.quanta || [2, 4, 8], config?.agingThreshold || 10); break;
            default: return res.status(400).json({ error: 'Unknown algorithm' });
        }

        if (mongoose.connection.readyState === 1) {
            const log = new SimulationLog({
                algorithm,
                processes: sanitizedProcesses,
                metrics: result.metrics,
                averageMetrics: result.averageMetrics
            });
            await log.save().catch(e => console.error("DB Save Error:", e));
        }

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Simulation failed' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
