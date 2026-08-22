#!/usr/bin/env node

// Self-contained local MCP server for the DigitalQubit Codex plugin.
// Uses newline-delimited JSON-RPC over stdio and has no npm dependencies.

class DigitalQubit {
  constructor() {
    this.alpha = 1;
    this.beta = 0;
    this.phase = 0;
    this.entanglement = 0;
    this.energy = 0;
    this.memorySnapshots = [];
    this.gateApplied = '';
    this.lastMeasure = 1;
    this.layer = 0;
    this.neuronIndex = 0;
    this.activation = 0;
    this.gradient = 0;
  }

  normalize() {
    const n = Math.hypot(this.alpha, this.beta);
    if (n > 0) {
      this.alpha /= n;
      this.beta /= n;
    }
  }

  updateActivation() {
    this.activation = this.beta * this.beta;
  }

  applyActivation(input) {
    const angle = Math.PI * input;
    this.alpha = Math.cos(angle / 2);
    this.beta = Math.sin(angle / 2);
    this.normalize();
    this.updateActivation();
    return this.activation;
  }

  createSnapshot() {
    const snapshot = {
      alpha: this.alpha,
      beta: this.beta,
      phase: this.phase,
      energy: this.energy,
      activation: this.activation
    };
    this.memorySnapshots.unshift(snapshot);
    return snapshot;
  }

  mixWithSnapshot(index, strength) {
    if (index < 0 || index >= this.memorySnapshots.length) return false;
    const s = this.memorySnapshots[index];
    this.alpha = this.alpha * (1 - strength) + s.alpha * strength;
    this.beta = this.beta * (1 - strength) + s.beta * strength;
    this.phase = this.phase * (1 - strength) + s.phase * strength;
    this.energy = this.energy * (1 - strength) + s.energy * strength;
    this.normalize();
    this.updateActivation();
    return true;
  }

  applyGate(bias, decay) {
    this.createSnapshot();
    if (Math.random() < bias) {
      const a = this.alpha;
      const b = this.beta;
      const inv = 1 / Math.sqrt(2);
      this.alpha = (a + b) * inv;
      this.beta = (a - b) * inv;
      this.phase += Math.PI / 4;
      this.gateApplied = 'H';
    } else {
      [this.alpha, this.beta] = [this.beta, this.alpha];
      this.phase += Math.PI / 2;
      this.gateApplied = 'X';
    }
    this.alpha += (Math.random() * 2 - 1) * decay;
    this.beta += (Math.random() * 2 - 1) * decay;
    this.phase += (Math.random() * 2 - 1) * decay * Math.PI;
    this.energy = 0.5 + 0.5 * Math.sin(this.phase) * Math.abs(this.alpha - this.beta);
    this.normalize();
    this.updateActivation();
  }

  measure() {
    const probAlpha = this.alpha * this.alpha;
    this.lastMeasure = Math.random() < probAlpha ? 1 : 0;
    return this.lastMeasure;
  }

  getBlochCoordinates() {
    const theta = 2 * Math.acos(Math.min(1, Math.abs(this.alpha)));
    return [
      Math.sin(theta) * Math.cos(this.phase),
      Math.sin(theta) * Math.sin(this.phase),
      Math.cos(theta)
    ];
  }
}

function calculateMetrics(qubits) {
  if (!qubits.length) return { coherence: 0, entropy: 0, phaseCoherence: 0 };
  let coherence = 0;
  let entropy = 0;
  let x = 0;
  let y = 0;
  for (const q of qubits) {
    coherence += Math.abs(q.alpha * q.beta) * 4;
    const p = Math.max(1e-9, Math.min(1 - 1e-9, q.alpha * q.alpha));
    entropy -= p * Math.log2(p) + (1 - p) * Math.log2(1 - p);
    x += Math.cos(q.phase);
    y += Math.sin(q.phase);
  }
  return {
    coherence: coherence / qubits.length,
    entropy: entropy / qubits.length,
    phaseCoherence: Math.hypot(x, y) / qubits.length
  };
}

class QubitEngine {
  constructor() {
    this.layerSizes = [12, 36, 12];
    this.bias = 0.5;
    this.decay = 0.01;
    this.learningRate = 0.005;
    this.feedbackStrength = 0.5;
    this.iterationCount = 0;
    this.overallError = 0;
    this.rewardHistory = [];
    this.qubits = [];
    this.entanglementMap = new Map();
    this.pairs = [];
    this.init();
  }

  init() {
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < this.layerSizes[layer]; i++) {
        const q = new DigitalQubit();
        q.layer = layer;
        q.neuronIndex = i;
        this.qubits.push(q);
      }
    }
    this.inputLayer = this.qubits.slice(0, 12);
    this.hiddenLayer = this.qubits.slice(12, 48);
    this.outputLayer = this.qubits.slice(48, 60);

    for (let i = 0; i < 12; i++) {
      for (let h = 0; h < 36; h++) {
        const j = 12 + h;
        this.pairs.push([i, j]);
        this.entanglementMap.set(`${i}-${j}`, 0.1 + Math.random() * 0.3);
      }
    }
    for (let h = 0; h < 36; h++) {
      for (let o = 0; o < 12; o++) {
        const i = 12 + h;
        const j = 48 + o;
        this.pairs.push([i, j]);
        this.entanglementMap.set(`${i}-${j}`, 0.1 + Math.random() * 0.3);
      }
    }
  }

  validateVector(values, name = 'inputs') {
    if (!Array.isArray(values) || values.length !== 12) throw new Error(`${name} must contain exactly 12 values.`);
    return values.map((v, i) => {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error(`${name}[${i}] must be finite.`);
      return Math.max(0, Math.min(1, n));
    });
  }

  process(inputs) {
    const v = this.validateVector(inputs);
    this.inputLayer.forEach((q, i) => q.applyActivation(v[i]));
    const ia = this.inputLayer.map(q => q.activation);
    this.hiddenLayer.forEach((q, h) => {
      let sum = 0;
      const hi = 12 + h;
      for (let i = 0; i < 12; i++) sum += ia[i] * (this.entanglementMap.get(`${i}-${hi}`) || 0);
      q.applyActivation(sum);
    });
    const ha = this.hiddenLayer.map(q => q.activation);
    this.outputLayer.forEach((q, o) => {
      let sum = 0;
      const oi = 48 + o;
      for (let h = 0; h < 36; h++) sum += ha[h] * (this.entanglementMap.get(`${12 + h}-${oi}`) || 0);
      q.applyActivation(sum);
    });
    return { outputs: this.outputLayer.map(q => q.activation), metrics: calculateMetrics(this.qubits) };
  }

  updateEntanglement() {
    for (const [i, j] of this.pairs) {
      const a = this.qubits[i];
      const b = this.qubits[j];
      const key = `${i}-${j}`;
      const overlap = Math.abs(a.alpha * b.alpha + a.beta * b.beta);
      const phaseAlign = Math.cos(a.phase - b.phase);
      let next = (this.entanglementMap.get(key) || 0) * 0.95 + overlap * (0.5 + 0.5 * phaseAlign) * 0.05;
      if (b.gradient) next += this.learningRate * a.activation * b.gradient;
      next = Math.max(0, Math.min(0.95, next));
      this.entanglementMap.set(key, next);
      a.entanglement = Math.max(a.entanglement, next);
      b.entanglement = Math.max(b.entanglement, next);
    }
  }

  evolve(cycles = 1) {
    cycles = Math.max(1, Math.min(100, Math.floor(Number(cycles) || 1)));
    for (let c = 0; c < cycles; c++) {
      this.qubits.forEach(q => q.applyGate(this.bias, this.decay));
      this.updateEntanglement();
    }
    return { cycles, metrics: calculateMetrics(this.qubits), totalSnapshots: this.snapshotCount() };
  }

  recall({ mode = 'global', depth = 0, strength = this.feedbackStrength, layer = 1 } = {}) {
    strength = Math.max(0, Math.min(1, Number(strength)));
    depth = Math.max(0, Math.floor(Number(depth) || 0));
    let recalled = 0;
    for (const q of this.qubits) {
      if (mode === 'layer' && q.layer !== Number(layer)) continue;
      if (!q.memorySnapshots.length) continue;
      const index = mode === 'individual' ? Math.floor(Math.random() * q.memorySnapshots.length) : Math.min(depth, q.memorySnapshots.length - 1);
      if (q.mixWithSnapshot(index, strength)) recalled++;
    }
    return { mode, recalled, totalQubits: 60 };
  }

  measure(layer = 'output') {
    const selected = layer === 'input' ? this.inputLayer : layer === 'hidden' ? this.hiddenLayer : this.outputLayer;
    return selected.map((q, index) => ({ index, result: q.measure(), activation: q.activation, alpha: q.alpha, beta: q.beta, phase: q.phase, energy: q.energy }));
  }

  reward(amount = 1, target = null) {
    const reward = Math.max(-1, Math.min(1, Number(amount) || 0));
    const outputs = this.outputLayer.map(q => q.activation);
    const desired = target ? this.validateVector(target, 'target') : outputs.map(v => Math.max(0, Math.min(1, v + reward * 0.1)));
    let error = 0;
    this.outputLayer.forEach((q, i) => {
      q.gradient = desired[i] - q.activation;
      error += q.gradient * q.gradient;
      q.beta += q.gradient * this.learningRate * 0.1;
      q.normalize();
      q.updateActivation();
    });
    this.overallError = error / 12;
    this.iterationCount++;
    this.updateEntanglement();
    this.feedbackStrength = Math.max(0, Math.min(0.95, this.feedbackStrength + reward * 0.01));
    this.rewardHistory.push({ time: Date.now(), reward, error: this.overallError });
    return { reward, networkError: this.overallError, feedbackStrength: this.feedbackStrength };
  }

  snapshotCount() {
    return this.qubits.reduce((s, q) => s + q.memorySnapshots.length, 0);
  }

  inspect(includeQubits = false) {
    const result = {
      architecture: { layerSizes: [...this.layerSizes], totalQubits: 60, connections: this.pairs.length },
      parameters: { bias: this.bias, decay: this.decay, learningRate: this.learningRate, feedbackStrength: this.feedbackStrength },
      metrics: calculateMetrics(this.qubits),
      networkError: this.overallError,
      iterationCount: this.iterationCount,
      totalSnapshots: this.snapshotCount(),
      outputActivations: this.outputLayer.map(q => q.activation)
    };
    if (includeQubits) result.qubits = this.qubits.map((q, index) => ({ index, layer: q.layer, neuronIndex: q.neuronIndex, alpha: q.alpha, beta: q.beta, phase: q.phase, energy: q.energy, entanglement: q.entanglement, activation: q.activation, gateApplied: q.gateApplied, memoryCount: q.memorySnapshots.length, bloch: q.getBlochCoordinates() }));
    return result;
  }
}

let engine = new QubitEngine();

const tools = [
  { name: 'digitalqubit_process', description: 'Send exactly 12 normalized values through the DigitalQubit 12/36/12 cognitive network.', inputSchema: { type: 'object', properties: { inputs: { type: 'array', minItems: 12, maxItems: 12, items: { type: 'number', minimum: 0, maximum: 1 } } }, required: ['inputs'], additionalProperties: false } },
  { name: 'digitalqubit_evolve', description: 'Evolve all DigitalQubit states for 1 to 100 software gate cycles and return metrics.', inputSchema: { type: 'object', properties: { cycles: { type: 'integer', minimum: 1, maximum: 100, default: 1 } }, additionalProperties: false } },
  { name: 'digitalqubit_inspect', description: 'Inspect the current DigitalQubit network architecture, parameters, metrics, outputs, and optionally all qubit states.', inputSchema: { type: 'object', properties: { includeQubits: { type: 'boolean', default: false } }, additionalProperties: false } },
  { name: 'digitalqubit_recall', description: 'Blend stored DigitalQubit snapshots back into the current state.', inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['global', 'layer', 'individual'], default: 'global' }, depth: { type: 'integer', minimum: 0, default: 0 }, strength: { type: 'number', minimum: 0, maximum: 1 }, layer: { type: 'integer', minimum: 0, maximum: 2, default: 1 } }, additionalProperties: false } },
  { name: 'digitalqubit_measure', description: 'Perform stochastic software measurement of the input, hidden, or output DigitalQubit layer.', inputSchema: { type: 'object', properties: { layer: { type: 'string', enum: ['input', 'hidden', 'output'], default: 'output' } }, additionalProperties: false } },
  { name: 'digitalqubit_reward', description: 'Apply bounded reinforcement from -1 to 1, optionally toward an exact 12-value target vector.', inputSchema: { type: 'object', properties: { amount: { type: 'number', minimum: -1, maximum: 1, default: 1 }, target: { type: 'array', minItems: 12, maxItems: 12, items: { type: 'number', minimum: 0, maximum: 1 } } }, additionalProperties: false } },
  { name: 'digitalqubit_reset', description: 'Reset the local DigitalQubit cognitive engine to a fresh 60-qubit state.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } }
];

function toolCall(name, args = {}) {
  switch (name) {
    case 'digitalqubit_process': return engine.process(args.inputs);
    case 'digitalqubit_evolve': return engine.evolve(args.cycles);
    case 'digitalqubit_inspect': return engine.inspect(Boolean(args.includeQubits));
    case 'digitalqubit_recall': return engine.recall(args);
    case 'digitalqubit_measure': return { layer: args.layer || 'output', measurements: engine.measure(args.layer || 'output') };
    case 'digitalqubit_reward': return engine.reward(args.amount, args.target || null);
    case 'digitalqubit_reset': engine = new QubitEngine(); return { ok: true, state: engine.inspect(false) };
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function ok(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function fail(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    handle(msg);
  }
});

function handle(msg) {
  if (Array.isArray(msg)) {
    for (const item of msg) handle(item);
    return;
  }
  const { id, method, params = {} } = msg;
  try {
    if (method === 'initialize') {
      return ok(id, {
        protocolVersion: params.protocolVersion || '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'digitalqubit-cognitive-engine', version: '0.1.0' }
      });
    }
    if (method === 'notifications/initialized' || method === 'notifications/cancelled') return;
    if (method === 'ping') return ok(id, {});
    if (method === 'tools/list') return ok(id, { tools });
    if (method === 'tools/call') {
      const result = toolCall(params.name, params.arguments || {});
      return ok(id, { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, isError: false });
    }
    if (id !== undefined) return fail(id, -32601, `Method not found: ${method}`);
  } catch (error) {
    if (id !== undefined) return fail(id, -32000, error?.message || 'Tool error');
  }
}

process.on('uncaughtException', error => process.stderr.write(`[digitalqubit] ${error.stack || error.message}\n`));
process.on('unhandledRejection', error => process.stderr.write(`[digitalqubit] ${error?.stack || error}\n`));
