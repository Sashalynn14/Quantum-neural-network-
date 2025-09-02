import { DigitalQubit } from './DigitalQubit.js';
import { calculateMetrics } from './Metrics.js';
import { manageMemory, recallMemory } from './MemoryManager.js';
import { tuneParameters } from './ParameterTuner.js';
import { evaluateHealth, generateImprovement, applyModification } from './SelfModifier.js';

import { createMemoryStreamParticle, createMemoryRecallRipple } from '../visualization/Effects.js';
import { updateScrollingCharts } from '../ui/Charts.js';
import { updateCodeHealthVisuals } from '../ui/CodeEditor.js';

import * as THREE from 'three';
import { scene, material, colArr } from '../visualization/Scene.js';

export class QuantumCognitiveEngine {
  constructor(numQubits = 60) {
    // Neural network architecture configuration
    this.layerSizes = [12, 36, 12]; // Input, hidden, output layer sizes
    this.totalQubits = this.layerSizes.reduce((a, b) => a + b, 0);
    
    // Initialize qubits with neural network structure
    this.qubits = [];
    this.initializeNeuralNetwork();
    
    // Connections map
    this.connections = new Map();
    this.weights = new Map();
    
    // Neural network layers
    this.inputLayer = [];
    this.hiddenLayer = [];
    this.outputLayer = [];
    this.setupNetworkLayers();
    
    // Initialize angles for visualization
    this.angles = this.qubits.map((_, i) => (i / this.totalQubits) * 2 * Math.PI);
    
    // Memory systems - now distributed across qubits
    this.totalSnapshots = 0;    // Count of all snapshots across all qubits
    this.memoryGroups = [];     // Still maintain groups for higher-level patterns
    this.lastMemoryGroupTime = 0;
    this.lastRecallTime = 0;
    this.lastRecalledIndex = -1;

    // Parameters
    this.bias = 0.5;
    this.decay = 0.01;
    this.learningRate = 0.005;
    this.feedbackStrength = 0.5;
    this.targetCoherence = 0.7;
    this.targetEntropy = 0.5;
    this.targetPhaseCoherence = 0.6;

    // Metrics
    this.coherenceHistory = [];
    this.entropyHistory = [];
    this.phaseCoherenceHistory = [];
    this.perfHistory = [];
    this.lastCalcTime = 0;
    
    // Self-modification
    this.codeEvolutions = 0;
    this.codeHealth = 0.5;
    this.codeEditingLines = new Set();
    this.editingTimeout = null;
    this.lastCodeEvalTime = 0;
    
    // Learning metrics
    this.overallError = 0;
    this.iterationCount = 0;
    this.learningCurve = [];

    this.lastUpdate = Date.now();
  }
  
  // Initialize the neural network structure
  initializeNeuralNetwork() {
    let qubitIndex = 0;
    
    // Create qubits for each layer
    for (let layer = 0; layer < this.layerSizes.length; layer++) {
      for (let i = 0; i < this.layerSizes[layer]; i++) {
        const qubit = new DigitalQubit();
        qubit.layer = layer;
        qubit.neuronIndex = i;
        this.qubits.push(qubit);
        qubitIndex++;
      }
    }
    
    // Setup entangled pairs and connections
    this.setupConnections();
  }
  
  // Set up network layers for easier access
  setupNetworkLayers() {
    let currentIndex = 0;
    
    // Input layer
    this.inputLayer = this.qubits.slice(currentIndex, currentIndex + this.layerSizes[0]);
    currentIndex += this.layerSizes[0];
    
    // Hidden layer
    this.hiddenLayer = this.qubits.slice(currentIndex, currentIndex + this.layerSizes[1]);
    currentIndex += this.layerSizes[1];
    
    // Output layer
    this.outputLayer = this.qubits.slice(currentIndex, currentIndex + this.layerSizes[2]);
  }
  
  // Set up neural connections between layers
  setupConnections() {
    // Create pairs array for visualization
    this.pairs = [];
    this.entanglementMap = new Map();
    
    let currentIndex = 0;
    
    // Connect input to hidden layer
    for (let i = 0; i < this.layerSizes[0]; i++) {
      const inputIdx = i;
      const inputQubit = this.qubits[inputIdx];
      
      // Each input connects to all hidden neurons
      for (let h = 0; h < this.layerSizes[1]; h++) {
        const hiddenIdx = this.layerSizes[0] + h;
        const hiddenQubit = this.qubits[hiddenIdx];
        
        // Add connection
        inputQubit.connections = inputQubit.connections || [];
        inputQubit.connections.push(hiddenIdx);
        inputQubit.weights = inputQubit.weights || [];
        inputQubit.weights.push(Math.random() * 0.5 - 0.25); // Initialize with small random weights
        
        // Track pair for visualization
        this.pairs.push([inputIdx, hiddenIdx]);
        
        // Set initial entanglement
        const entanglementKey = `${inputIdx}-${hiddenIdx}`;
        this.entanglementMap.set(entanglementKey, 0.1 + Math.random() * 0.3); // Initial weak entanglement
      }
    }
    
    // Connect hidden to output layer
    for (let h = 0; h < this.layerSizes[1]; h++) {
      const hiddenIdx = this.layerSizes[0] + h;
      const hiddenQubit = this.qubits[hiddenIdx];
      
      // Each hidden connects to all output neurons
      for (let o = 0; o < this.layerSizes[2]; o++) {
        const outputIdx = this.layerSizes[0] + this.layerSizes[1] + o;
        const outputQubit = this.qubits[outputIdx];
        
        // Add connection
        hiddenQubit.connections = hiddenQubit.connections || [];
        hiddenQubit.connections.push(outputIdx);
        hiddenQubit.weights = hiddenQubit.weights || [];
        hiddenQubit.weights.push(Math.random() * 0.5 - 0.25); // Initialize with small random weights
        
        // Track pair for visualization
        this.pairs.push([hiddenIdx, outputIdx]);
        
        // Set initial entanglement
        const entanglementKey = `${hiddenIdx}-${outputIdx}`;
        this.entanglementMap.set(entanglementKey, 0.1 + Math.random() * 0.3); // Initial weak entanglement
      }
    }
    
    // Initialize random clusters and super clusters for group interactions
    // These help with quantum effects beyond simple feedforward connections
    this.clusters = [];
    this.superClusters = [];
    
    // Create some random clusters
    const numClusters = Math.floor(this.totalQubits / 4);
    for (let i = 0; i < numClusters; i++) {
      const clusterSize = 4;
      const clusterIndices = [];
      for (let j = 0; j < clusterSize; j++) {
        const randomIndex = Math.floor(Math.random() * this.totalQubits);
        clusterIndices.push(randomIndex);
      }
      this.clusters.push(clusterIndices);
    }
    
    // Create some super clusters
    const numSuperClusters = Math.floor(this.totalQubits / 8);
    for (let i = 0; i < numSuperClusters; i++) {
      const superClusterSize = 8;
      const superClusterIndices = [];
      for (let j = 0; j < superClusterSize; j++) {
        const randomIndex = Math.floor(Math.random() * this.totalQubits);
        superClusterIndices.push(randomIndex);
      }
      this.superClusters.push(superClusterIndices);
    }
  }

  // Forward propagation through the quantum neural network
  forwardPropagate(inputs = null) {
    // If specific inputs provided, set them to input layer qubits
    if (inputs && inputs.length === this.layerSizes[0]) {
      for (let i = 0; i < this.layerSizes[0]; i++) {
        this.inputLayer[i].applyActivation(inputs[i]);
      }
    } else {
      // Otherwise use random inputs (or keep current state for self-operation)
      for (let i = 0; i < this.layerSizes[0]; i++) {
        if (Math.random() < 0.2) { // Only change some inputs to create interesting patterns
          this.inputLayer[i].applyActivation(Math.random());
        }
      }
    }
    
    // Extract input activations
    const inputActivations = this.inputLayer.map(q => q.activation);
    
    // Process hidden layer
    for (let i = 0; i < this.hiddenLayer.length; i++) {
      const hiddenQubit = this.hiddenLayer[i];
      // Calculate weighted sum from input layer
      let sum = 0;
      for (let j = 0; j < this.inputLayer.length; j++) {
        const inputIdx = j;
        const hiddenIdx = this.layerSizes[0] + i;
        const entanglementKey = `${inputIdx}-${hiddenIdx}`;
        const weight = this.entanglementMap.get(entanglementKey) || 0;
        
        sum += inputActivations[j] * weight;
      }
      
      // Apply quantum activation
      hiddenQubit.applyActivation(sum);
    }
    
    // Extract hidden activations
    const hiddenActivations = this.hiddenLayer.map(q => q.activation);
    
    // Process output layer
    for (let i = 0; i < this.outputLayer.length; i++) {
      const outputQubit = this.outputLayer[i];
      // Calculate weighted sum from hidden layer
      let sum = 0;
      for (let j = 0; j < this.hiddenLayer.length; j++) {
        const hiddenIdx = this.layerSizes[0] + j;
        const outputIdx = this.layerSizes[0] + this.layerSizes[1] + i;
        const entanglementKey = `${hiddenIdx}-${outputIdx}`;
        const weight = this.entanglementMap.get(entanglementKey) || 0;
        
        sum += hiddenActivations[j] * weight;
      }
      
      // Apply quantum activation
      outputQubit.applyActivation(sum);
    }
    
    // Return output layer activations
    return this.outputLayer.map(q => q.activation);
  }
  
  // Calculate entanglement (weights) based on qubit states
  updateEntanglement() {
    this.pairs.forEach(([i, j]) => {
      const q1 = this.qubits[i];
      const q2 = this.qubits[j];
      const key = `${i}-${j}`;

      // Original quantum physics approach to entanglement
      const overlap = Math.abs(q1.alpha * q2.alpha + q1.beta * q2.beta);
      const phaseAlign = Math.cos(q1.phase - q2.phase);
      
      // Get current entanglement/weight
      const currentVal = this.entanglementMap.get(key) || 0;

      // Update based on quantum state and learning rate
      // This represents both quantum physics and neural learning
      let newEntanglement = currentVal;
      
      // If neurons are in connected layers, adjust weight based on gradient and activation
      if ((q1.layer === 0 && q2.layer === 1) || (q1.layer === 1 && q2.layer === 2)) {
        // Apply a neural-network like weight update
        // Simplified version of backpropagation-inspired update
        const sourceActivation = q1.activation;
        const targetGradient = q2.gradient;
        
        // Adjust weight based on activation, gradient and learning rate
        if (targetGradient) {
          newEntanglement += this.learningRate * sourceActivation * targetGradient;
        }
        
        // Quantum physics influence on weights
        newEntanglement = newEntanglement * 0.95 + (overlap * (0.5 + 0.5 * phaseAlign)) * 0.05;
      } else {
        // For other connections, use standard quantum entanglement model
        newEntanglement = currentVal * 0.95 + (overlap * (0.5 + 0.5 * phaseAlign)) * 0.05;
      }
      
      // Clamp weights/entanglement to valid range
      newEntanglement = Math.max(0, Math.min(0.95, newEntanglement));
      
      // Update entanglement map
      this.entanglementMap.set(key, newEntanglement);
      
      // Update qubit entanglement properties
      q1.entanglement = q2.entanglement = Math.max(q1.entanglement, q2.entanglement, newEntanglement);
    });
  }
  
  // Simple backpropagation-inspired learning
  learnFromError() {
    // Generate a simple target pattern (could be replaced with actual targets)
    const targetPattern = Array(this.layerSizes[2]).fill(0).map((_, i) => 
      (i % 3 === 0) ? 0.8 : ((i % 3 === 1) ? 0.2 : 0.5)
    );
    
    // Get current outputs
    const outputs = this.outputLayer.map(q => q.activation);
    
    // Calculate output error
    let totalError = 0;
    this.outputLayer.forEach((q, i) => {
      const error = targetPattern[i] - outputs[i];
      totalError += error * error;
      
      // Set gradient for output qubits
      q.gradient = error;
      
      // Use error to adjust qubit state directly (quantum feedback)
      q.beta += error * this.learningRate * 0.1;
      q.normalize();
    });
    this.overallError = totalError / this.outputLayer.length;
    
    // Track learning progress
    this.iterationCount++;
    if (this.iterationCount % 10 === 0) {
      this.learningCurve.push(this.overallError);
      if (this.learningCurve.length > 50) this.learningCurve.shift();
    }
    
    // Calculate gradients for hidden layer (simplified backpropagation)
    this.hiddenLayer.forEach((hiddenQubit, h) => {
      let hiddenGradient = 0;
      
      // Sum up contributions from all connected output neurons
      this.outputLayer.forEach((outputQubit, o) => {
        const hiddenIdx = this.layerSizes[0] + h;
        const outputIdx = this.layerSizes[0] + this.layerSizes[1] + o;
        const entanglementKey = `${hiddenIdx}-${outputIdx}`;
        const weight = this.entanglementMap.get(entanglementKey) || 0;
        
        hiddenGradient += outputQubit.gradient * weight;
      });
      
      // Set gradient for hidden qubit
      hiddenQubit.gradient = hiddenGradient * hiddenQubit.activation * (1 - hiddenQubit.activation);
      
      // Use gradient to adjust qubit state directly
      hiddenQubit.beta += hiddenGradient * this.learningRate * 0.05;
      hiddenQubit.normalize();
    });
  }
  
  // Quantum gate operations on qubits
  _evolveQubits() {
    // Apply gates to all qubits
    this.qubits.forEach(q => {
      q.applyGate(this.bias, this.decay);
    });
    
    // Evolve neural network forward
    this.forwardPropagate();
    
    // Learning phase
    this.learnFromError();
    
    // Update entanglement (weights)
    this.updateEntanglement();
    
    // Process quantum cluster dynamics (quantum computing aspect)
    this.clusters.forEach(cluster => {
      let parity = 0;
      cluster.forEach(idx => {
        if (idx < this.qubits.length) {
          parity ^= this.qubits[idx].measure();
          this.qubits[idx].applyGate(this.bias, this.decay);
        }
      });
      if (parity === 1 && Math.random() < this.feedbackStrength) {
        const targetIdx = cluster[Math.floor(Math.random() * cluster.length)];
        if (targetIdx < this.qubits.length) {
          [this.qubits[targetIdx].alpha, this.qubits[targetIdx].beta] =
            [this.qubits[targetIdx].beta, this.qubits[targetIdx].alpha];
        }
      }
    });

    // Apply phase rotation
    this.qubits.forEach(q => {
      q.rotatePhase(0.01 * (Math.random() * 2 - 1) * this.decay);
    });
  }

  step() {
    const startTime = performance.now();

    this._evolveQubits();

    const { coherence, entropy, phaseCoherence } = calculateMetrics(this.qubits);

    this.coherenceHistory.push(coherence);
    this.entropyHistory.push(entropy);
    this.phaseCoherenceHistory.push(phaseCoherence);
    if (this.coherenceHistory.length > 100) this.coherenceHistory.shift();
    if (this.entropyHistory.length > 100) this.entropyHistory.shift();
    if (this.phaseCoherenceHistory.length > 100) this.phaseCoherenceHistory.shift();

    const endTime = performance.now();
    this.lastCalcTime = endTime - startTime;
    const perf = { time: Date.now(), coherence, entropy, phaseCoherence, calcTime: this.lastCalcTime };
    this.perfHistory.push(perf);
    if (this.perfHistory.length > 1000) this.perfHistory.shift();

    tuneParameters(this, { coherence, entropy, phaseCoherence });

    // Memory management - now distributed in qubits
    manageMemory(this);
    
    // Count snapshots from all qubits
    this.totalSnapshots = this.qubits.reduce((sum, q) => sum + q.memorySnapshots.length, 0);
    
    createMemoryStreamParticle(this);
    recallMemory(this);

    if (Date.now() - this.lastCodeEvalTime > 5000) {
      this.lastCodeEvalTime = Date.now();
      evaluateHealth(this);
      updateCodeHealthVisuals(this.codeHealth);
    }

    updateScrollingCharts(this);

    return { 
      coherence, 
      entropy, 
      phaseCoherence, 
      calcTime: this.lastCalcTime,
      networkError: this.overallError
    };
  }

  // Get a memory snapshot from qubits for display or analysis
  getGlobalSnapshot() {
    return this.qubits.map(q => ({
      alpha: q.alpha,
      beta: q.beta,
      phase: q.phase,
      energy: q.energy,
      layer: q.layer,
      neuronIndex: q.neuronIndex,
      activation: q.activation,
      memoryCount: q.memorySnapshots.length
    }));
  }

  compress() {
    this.lastCompressTime = Date.now();
    const flat = [];
    this.qubits.forEach(q => {
      flat.push(q.alpha, q.beta, q.phase, q.energy);
    });
    return flat;
  }

  generateCodeImprovement() {
    return generateImprovement(this);
  }

  applyCodeModification(code) {
    const executionContext = {
      DigitalQubit,
      updateCodeHealthVisuals,
      THREE,
      scene,
      material,
      colArr,
      engine: this
    };

    const result = applyModification(this, code, executionContext);

    if (result.success) {
      this.codeEvolutions++;
      updateCodeHealthVisuals(this.codeHealth);
    }
    return result;
  }
}

export default QuantumCognitiveEngine;