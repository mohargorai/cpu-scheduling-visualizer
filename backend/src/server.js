const express = require('express');
const cors = require('cors');
const { simulateFCFS } = require('./simulator/fcfs');
const { simulateSJF } = require('./simulator/sjf');
const { simulateRR } = require('./simulator/rr');
const { simulatePriority } = require('./simulator/priority');
const { simulateMLFQ } = require('./simulator/mlfq');
const { simulateMLQ } = require('./simulator/mlq');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/simulate', (req, res) => {
    try {
        const { algorithm, processes, config } = req.body;
        
        // --- SECURITY & DoS PROTECTION ---
        if (!Array.isArray(processes)) {
            return res.status(400).json({ error: 'Invalid payload: processes must be an array' });
        }
        if (processes.length > 1500) {
            return res.status(413).json({ error: 'Payload too large: Max 1500 processes allowed per simulation to prevent server overload.' });
        }
        
        // Sanitize inputs to ensure they are strictly numbers
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
            case 'MLQ': result = simulateMLQ(sanitizedProcesses, config?.quanta || [2, 4]); break;
            default: return res.status(400).json({ error: 'Unknown algorithm' });
        }

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Simulation failed' });
    }
});

const path = require('path');
const distPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));

const fs = require('fs');
const indexHtml = path.join(distPath, 'index.html');
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
    }
    if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
    } else {
        res.send('CPU Scheduler Backend API running');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
