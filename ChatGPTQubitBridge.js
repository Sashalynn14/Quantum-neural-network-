import { DigitalQubit } from './DigitalQubit.js';
import { calculateMetrics } from './Metrics.js';
import { tuneParameters } from './ParameterTuner.js';

/**
 * Headless bridge around the same DigitalQubit logic used by QuantumCognitiveEngine.
 *
 * This intentionally avoids importing CognitiveEngine.js because that file currently
 * has browser/visualization dependencies and import paths that do not resolve in a
 * standalone Node process. The bridge mirrors the engine's 12/36/12 architecture,
 * propagation, entanglement update, memory snapshots, and adaptive tuning so it can
 * be safely exposed as a plugin/tool service.
 */
export class ChatGPTQubitBridge {
  constructor(options = {}) {
    this.layerSizes = Array.isArray(options.layerSizes)
      ? options.layerSizes.map(Number)
      : [12, 36, 12];

    if (this.layerSizes.length !== 3 || this.layerSizes.some(n => !Number.isInteger(n) || n <= 0)) {
      throw new Error('layerSizes must contain exactly three positive integers.');
    }

    this.totalQubits = this.layerSizes.reduce((sum, n) => sum + n, 0);

    this.bias = options.bias ?? 0.5;
    this.decay = options.decay ?? 0.01;
    this.learningRate = options.learningRate ?? 0.005;
    this.feedbackStrength = options.feedbackStrength ?? 0.5;
    this.targetCoherence = options.targetCoherence ?? 0.7;
    this.targetEntropy = options.targetEntropy ?? 0.5;
    this.targetPhaseCoherence = options.targetPhaseCoherence ?? 0.6;

    this.coherenceHistory = [];
    this.entropyHistory = [];
    this.phaseCoherenceHistory = [];
    this.perfHistory = [];
    this.learningCurve = [];
    this.overallError = 0;
    this.iterationCount = 0;
    this.totalSnapshots = 0;
    this.lastRecallTime = 0;
    this.lastRecalledIndex = -1;

    this.qubits = [];
    this.pairs = [];
    this.entanglementMap = new Map();
    this.rewardHistory = [];

    this._initializeNetwork();
  }

  _initializeNetwork() {
    for (let layer = 0; layer < this.layerSizes.length; layer++) {
      for (let neuronIndex = 0; neuronIndex < this.layerSizes[layer]; neuronIndex++) {
        const qubit = new DigitalQubit();
        qubit.layer = layer;
        qubit.neuronIndex = neuronIndex;
        this.qubits.push(qubit);
      }
    }

    let offset = 0;
    this.inputLayer = this.qubits.slice(offset, offset + this.layerSizes[0]);
    offset += this.layerSizes[0];
    this.hiddenLayer = this.qubits.slice(offset, offset + this.layerSizes[1]);
    offset += this.layerSizes[1];
    this.outputLayer = this.qubits.slice(offset, offset + this.layerSizes[2]);

    this._setupConnections();
  }

  _setupConnections() {
    const inputCount = this.layerSizes[0];
    const hiddenCount = this.layerSizes[1];
    const outputCount = this.layerSizes[2];

    for (let i = 0; i < inputCount; i++) {
      const source = this.inputLayer[i];
      for (let h = 0; h < hiddenCount; h++) {
        const targetIndex = inputCount + h;
        source.connections.push(targetIndex);
        source.weights.push(Math.random() * 0.5 - 0.25);
        this.pairs.push([i, targetIndex]);
        this.entanglementMap.set(`${i}-${targetIndex}`, 0.1 + Math.random() * 0.3);
      }
    }

    for (let h = 0; h < hiddenCount; h++) {
      const sourceIndex = inputCount + h;
      const source = this.qubits[sourceIndex];
      for (let o = 0; o < outputCount; o++) {
        const targetIndex = inputCount + hiddenCount + o;
        source.connections.push(targetIndex);
        source.weights.push(Math.random() * 0.5 - 0.25);
        this.pairs.push([sourceIndex, targetIndex]);
        this.entanglementMap.set(`${sourceIndex}-${targetIndex}`, 0.1 + Math.random() * 0.3);
      }
    }
  }

  _validateInputs(inputs) {
    if (!Array.isArray(inputs) || inputs.length !== this.layerSizes[0]) {
      throw new Error(`inputs must contain exactly ${this.layerSizes[0]} numeric values.`);
    }

    return inputs.map((value, index) => {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        throw new Error(`inputs[${index}] must be a finite number.`);
      }
      return Math.max(0, Math.min(1, n));
    });
  }

  forwardPropagate(inputs) {
    const normalizedInputs = this._validateInputs(inputs);

    for (let i = 0; i < this.inputLayer.length; i++) {
      this.inputLayer[i].applyActivation(normalizedInputs[i]);
    }

    const inputActivations = this.inputLayer.map(q => q.activation);

    for (let h = 0; h < this.hiddenLayer.length; h++) {
      let sum = 0;
      const hiddenIndex = this.layerSizes[0] + h;
      for (let i = 0; i < this.inputLayer.length; i++) {
        const weight = this.entanglementMap.get(`${i}-${hiddenIndex}`) || 0;
        sum += inputActivations[i] * weight;
      }
      this.hiddenLayer[h].applyActivation(sum);
    }

    const hiddenActivations = this.hiddenLayer.map(q => q.activation);

    for (let o = 0; o < this.outputLayer.length; o++) {
      let sum = 0;
      const outputIndex = this.layerSizes[0] + this.layerSizes[1] + o;
      for (let h = 0; h < this.hiddenLayer.length; h++) {
        const hiddenIndex = this.layerSizes[0] + h;
        const weight = this.entanglementMap.get(`${hiddenIndex}-${outputIndex}`) || 0;
        sum += hiddenActivations[h] * weight;
      }
      this.outputLayer[o].applyActivation(sum);
    }

    return this.outputLayer.map(q => q.activation);
  }

  updateEntanglement() {
    for (const [i, j] of this.pairs) {
      const q1 = this.qubits[i];
      const q2 = this.qubits[j];
      const key = `${i}-${j}`;
      const overlap = Math.abs(q1.alpha * q2.alpha + q1.beta * q2.beta);
      const phaseAlign = Math.cos(q1.phase - q2.phase);
      const current = this.entanglementMap.get(key) || 0;

      let next = current;
      if ((q1.layer === 0 && q2.layer === 1) || (q1.layer === 1 && q2.layer === 2)) {
        if (q2.gradient) {
          next += this.learningRate * q1.activation * q2.gradient;
        }
      }

      next = next * 0.95 + overlap * (0.5 + 0.5 * phaseAlign) * 0.05;
      next = Math.max(0, Math.min(0.95, next));
      this.entanglementMap.set(key, next);
      q1.entanglement = Math.max(q1.entanglement, next);
      q2.entanglement = Math.max(q2.entanglement, next);
    }
  }

  learnFromTarget(targetPattern) {
    if (!Array.isArray(targetPattern) || targetPattern.length !== this.outputLayer.length) {
      throw new Error(`targetPattern must contain exactly ${this.outputLayer.length} values.`);
    }

    const targets = targetPattern.map(v => Math.max(0, Math.min(1, Number(v))));
    const outputs = this.outputLayer.map(q => q.activation);
    let totalError = 0;

    this.outputLayer.forEach((q, i) => {
      const error = targets[i] - outputs[i];
      totalError += error * error;
      q.gradient = error;
      q.beta += error * this.learningRate * 0.1;
      q.normalize();
      q.updateActivation();
    });

    this.overallError = totalError / this.outputLayer.length;
    this.iterationCount++;

    if (this.iterationCount % 10 === 0) {
      this.learningCurve.push(this.overallError);
      if (this.learningCurve.length > 50) this.learningCurve.shift();
    }

    this.hiddenLayer.forEach((hiddenQubit, h) => {
      let hiddenGradient = 0;
      const hiddenIndex = this.layerSizes[0] + h;

      this.outputLayer.forEach((outputQubit, o) => {
        const outputIndex = this.layerSizes[0] + this.layerSizes[1] + o;
        const weight = this.entanglementMap.get(`${hiddenIndex}-${outputIndex}`) || 0;
        hiddenGradient += outputQubit.gradient * weight;
      });

      hiddenQubit.gradient = hiddenGradient * hiddenQubit.activation * (1 - hiddenQubit.activation);
      hiddenQubit.beta += hiddenGradient * this.learningRate * 0.05;
      hiddenQubit.normalize();
      hiddenQubit.updateActivation();
    });

    this.updateEntanglement();
    return this.overallError;
  }

  evolve(cycles = 1) {
    const count = Math.max(1, Math.min(100, Math.floor(Number(cycles) || 1)));
    let metrics = null;

    for (let cycle = 0; cycle < count; cycle++) {
      for (const qubit of this.qubits) {
        qubit.applyGate(this.bias, this.decay);
      }

      this.updateEntanglement();
      metrics = calculateMetrics(this.qubits);
      tuneParameters(this, metrics);

      this.coherenceHistory.push(metrics.coherence);
      this.entropyHistory.push(metrics.entropy);
      this.phaseCoherenceHistory.push(metrics.phaseCoherence);

      if (this.coherenceHistory.length > 100) this.coherenceHistory.shift();
      if (this.entropyHistory.length > 100) this.entropyHistory.shift();
      if (this.phaseCoherenceHistory.length > 100) this.phaseCoherenceHistory.shift();
    }

    this.totalSnapshots = this.qubits.reduce((sum, q) => sum + q.memorySnapshots.length, 0);
    return metrics;
  }

  recall({ mode = 'global', depth = 0, strength = this.feedbackStrength, layer = 1 } = {}) {
    const mixStrength = Math.max(0, Math.min(1, Number(strength)));
    let recalled = 0;

    if (mode === 'layer') {
      const targetLayer = Math.max(0, Math.min(2, Math.floor(Number(layer))));
      for (const qubit of this.qubits) {
        if (qubit.layer !== targetLayer || qubit.memorySnapshots.length === 0) continue;
        const index = Math.min(Math.max(0, Math.floor(Number(depth) || 0)), qubit.memorySnapshots.length - 1);
        if (qubit.mixWithSnapshot(index, mixStrength)) recalled++;
      }
      this.lastRecalledIndex = -1 - targetLayer;
    } else if (mode === 'individual') {
      for (const qubit of this.qubits) {
        if (qubit.memorySnapshots.length === 0) continue;
        const maxDepth = Math.min(20, qubit.memorySnapshots.length);
        const index = Math.floor(Math.random() * maxDepth);
        if (qubit.mixWithSnapshot(index, mixStrength)) recalled++;
      }
      this.lastRecalledIndex = -5;
    } else {
      const requestedDepth = Math.max(0, Math.floor(Number(depth) || 0));
      for (const qubit of this.qubits) {
        if (qubit.memorySnapshots.length <= requestedDepth) continue;
        if (qubit.mixWithSnapshot(requestedDepth, mixStrength)) recalled++;
      }
      this.lastRecalledIndex = requestedDepth;
    }

    this.lastRecallTime = Date.now();
    return { mode, recalled, totalQubits: this.totalQubits };
  }

  measure(layer = 'output') {
    const selected = layer === 'input'
      ? this.inputLayer
      : layer === 'hidden'
        ? this.hiddenLayer
        : this.outputLayer;

    return selected.map((q, index) => ({
      index,
      result: q.measure(),
      activation: q.activation,
      alpha: q.alpha,
      beta: q.beta,
      phase: q.phase,
      energy: q.energy
    }));
  }

  reward({ amount = 1, target = null } = {}) {
    const reward = Math.max(-1, Math.min(1, Number(amount) || 0));
    const outputs = this.outputLayer.map(q => q.activation);

    const desired = Array.isArray(target) && target.length === this.outputLayer.length
      ? target.map(v => Math.max(0, Math.min(1, Number(v))))
      : outputs.map(v => Math.max(0, Math.min(1, v + reward * 0.1)));

    const error = this.learnFromTarget(desired);
    this.feedbackStrength = Math.max(0, Math.min(0.95, this.feedbackStrength + reward * 0.01));
    this.rewardHistory.push({ time: Date.now(), reward, error });
    if (this.rewardHistory.length > 1000) this.rewardHistory.shift();

    return { reward, error, feedbackStrength: this.feedbackStrength };
  }

  process(inputs, { evolveCycles = 0, target = null } = {}) {
    const outputs = this.forwardPropagate(inputs);
    let error = null;

    if (Array.isArray(target)) {
      error = this.learnFromTarget(target);
    }

    let metrics = calculateMetrics(this.qubits);
    if (evolveCycles > 0) {
      metrics = this.evolve(evolveCycles);
    }

    this.totalSnapshots = this.qubits.reduce((sum, q) => sum + q.memorySnapshots.length, 0);

    return {
      outputs: this.outputLayer.map(q => q.activation),
      rawOutputs: outputs,
      metrics,
      networkError: error ?? this.overallError,
      totalSnapshots: this.totalSnapshots
    };
  }

  inspect({ includeQubits = false } = {}) {
    const metrics = calculateMetrics(this.qubits);
    const state = {
      architecture: {
        layerSizes: [...this.layerSizes],
        totalQubits: this.totalQubits,
        connections: this.pairs.length
      },
      parameters: {
        bias: this.bias,
        decay: this.decay,
        learningRate: this.learningRate,
        feedbackStrength: this.feedbackStrength,
        targetCoherence: this.targetCoherence,
        targetEntropy: this.targetEntropy,
        targetPhaseCoherence: this.targetPhaseCoherence
      },
      metrics,
      networkError: this.overallError,
      iterationCount: this.iterationCount,
      totalSnapshots: this.qubits.reduce((sum, q) => sum + q.memorySnapshots.length, 0),
      outputActivations: this.outputLayer.map(q => q.activation)
    };

    if (includeQubits) {
      state.qubits = this.qubits.map((q, index) => ({
        index,
        layer: q.layer,
        neuronIndex: q.neuronIndex,
        alpha: q.alpha,
        beta: q.beta,
        phase: q.phase,
        energy: q.energy,
        entanglement: q.entanglement,
        activation: q.activation,
        gateApplied: q.gateApplied,
        memoryCount: q.memorySnapshots.length,
        bloch: q.getBlochCoordinates()
      }));
    }

    return state;
  }
}

export default ChatGPTQubitBridge;
