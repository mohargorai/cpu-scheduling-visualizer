const mongoose = require('mongoose');

const processSchema = new mongoose.Schema({
  id: String,
  arrivalTime: Number,
  burstTime: Number,
  priority: Number
});

const metricsSchema = new mongoose.Schema({
  id: String,
  completionTime: Number,
  turnaroundTime: Number,
  waitingTime: Number
});

const simulationLogSchema = new mongoose.Schema({
  algorithm: String,
  processes: [processSchema],
  averageMetrics: {
    avgWT: Number,
    avgTAT: Number,
    cpuUtilization: Number
  },
  metrics: [metricsSchema],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SimulationLog', simulationLogSchema);
