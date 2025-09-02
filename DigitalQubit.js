// Core Quantum Primitive
export class DigitalQubit {
  constructor() { 
    this.alpha = 1; 
    this.beta = 0; 
    this.phase = 0;
    this.entanglement = 0;
    this.dispX = 0; 
    this.dispY = 0;
    this.energy = 0;
    
    // Enhanced memory capabilities - store snapshots directly in qubit
    this.memorySnapshots = []; // Full state snapshots
    this.snapshotTimes = []; // Timestamps for efficiency
    // No limit on snapshots per user's request
    
    this.gateApplied = ''; // Tracks what gate was last applied
    this.gateTime = 0;     // When the gate was applied
    this.lastMeasure = 1;  // Last measurement result
    
    // Neural network properties
    this.layer = 0;        // Layer in neural network (0=input, 1=hidden, 2=output)
    this.neuronIndex = 0;  // Index within layer
    this.connections = []; // Indices of connected qubits
    this.weights = [];     // Connection weights (derived from entanglement)
    this.activation = 0;   // Activation value (derived from quantum state)
    this.bias = 0;         // Neural bias term
    this.gradient = 0;     // For backpropagation
  }
  
  normalize() {
    const n = Math.hypot(this.alpha, this.beta);
    if (n > 0) { 
      this.alpha /= n; 
      this.beta /= n; 
    }
  }
  
  measure() {
    // Collapse wavefunction based on probability
    const probAlpha = this.alpha * this.alpha;
    this.lastMeasure = Math.random() < probAlpha ? 1 : 0;
    return this.lastMeasure;
  }
  
  getBlochCoordinates() {
    // Convert quantum state to Bloch sphere coordinates
    const theta = 2 * Math.acos(Math.abs(this.alpha));
    const phi = this.phase;
    
    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.sin(theta) * Math.sin(phi);
    const z = Math.cos(theta);
    
    return [x, y, z];
  }
  
  // Create and store a snapshot of the current state
  createSnapshot() {
    const snapshot = {
      alpha: this.alpha,
      beta: this.beta,
      phase: this.phase,
      energy: this.energy,
      activation: this.activation,
      weights: [...this.weights] // Copy weights
    };
    
    this.memorySnapshots.unshift(snapshot);
    this.snapshotTimes.unshift(Date.now());
    
    return snapshot;
  }
  
  // Recall a specific snapshot
  recallSnapshot(index) {
    if (index >= this.memorySnapshots.length) return false;
    
    const snapshot = this.memorySnapshots[index];
    
    // Just mix with the snapshot using the provided strength
    return snapshot;
  }
  
  // Blend the current state with a historical state
  mixWithSnapshot(index, strength) {
    if (index >= this.memorySnapshots.length) return false;
    
    const snapshot = this.memorySnapshots[index];
    
    // Mix quantum amplitudes
    this.alpha = this.alpha * (1 - strength) + snapshot.alpha * strength;
    this.beta = this.beta * (1 - strength) + snapshot.beta * strength;
    
    // Mix phase (being careful with the circular nature of phase)
    let currentPhase = this.phase;
    let histPhase = snapshot.phase;
    
    // Adjust phases to be closer for interpolation
    if (Math.abs(currentPhase - histPhase) > Math.PI) {
      if (currentPhase > histPhase) {
        histPhase += 2 * Math.PI;
      } else {
        currentPhase += 2 * Math.PI;
      }
    }
    
    this.phase = (currentPhase * (1 - strength) + histPhase * strength) % (2 * Math.PI);
    if (this.phase < 0) this.phase += 2 * Math.PI;
    
    // Mix energy
    this.energy = this.energy * (1 - strength) + snapshot.energy * strength;
    
    // Normalize to ensure valid quantum state
    this.normalize();
    
    return true;
  }
  
  applyGate(bias, decay) {
    // Create snapshot of state before applying gate
    this.createSnapshot();
    
    // Record gate application time for animation
    this.gateTime = Date.now();
    
    // Apply Hadamard-like gate with bias
    if (Math.random() < bias) {
      const a = this.alpha, b = this.beta, inv = 1/Math.sqrt(2);
      this.alpha = (a + b) * inv;
      this.beta = (a - b) * inv;
      this.phase += Math.PI / 4;
      this.gateApplied = 'H'; // Hadamard gate
    } else {
      // X-gate (bit flip)
      [this.alpha, this.beta] = [this.beta, this.alpha];
      this.phase += Math.PI / 2;
      this.gateApplied = 'X'; // Pauli-X gate
    }
    
    // Add quantum noise (decoherence)
    this.alpha += (Math.random() * 2 - 1) * decay;
    this.beta += (Math.random() * 2 - 1) * decay;
    this.phase += (Math.random() * 2 - 1) * decay * Math.PI;
    
    // Calculate energy based on state
    this.energy = 0.5 + 0.5 * Math.sin(this.phase) * Math.abs(this.alpha - this.beta);
    
    // Normalize to maintain valid quantum state
    this.normalize();
    
    // Update neural network activation based on quantum state
    this.updateActivation();
  }
  
  // Update activation value based on quantum state
  updateActivation() {
    // Use the probability amplitude of |1⟩ state as activation
    this.activation = this.beta * this.beta;
  }
  
  // Apply activation function (quantum analog of sigmoid)
  applyActivation(input) {
    // Rotate qubit based on input
    const rotationAngle = Math.PI * input;
    const newAlpha = Math.cos(rotationAngle/2);
    const newBeta = Math.sin(rotationAngle/2);
    
    this.alpha = newAlpha;
    this.beta = newBeta;
    this.normalize();
    
    // Update activation
    this.updateActivation();
    return this.activation;
  }
  
  // Calculate weighted sum of inputs
  calculateWeightedSum(inputActivations) {
    let sum = this.bias; // Start with bias
    for (let i = 0; i < this.connections.length; i++) {
      const inputIdx = this.connections[i];
      const weight = this.weights[i];
      if (inputActivations[inputIdx] !== undefined) {
        sum += weight * inputActivations[inputIdx];
      }
    }
    return sum;
  }
  
  // Rotate phase directly
  rotatePhase(angle) {
    this.phase += angle;
    while (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
    while (this.phase < 0) this.phase += 2 * Math.PI;
  }
  
  // Get average state across snapshots
  getAverageState(count = 5) {
    if (this.memorySnapshots.length === 0) return null;
    
    const numToUse = Math.min(count, this.memorySnapshots.length);
    let avgAlpha = 0, avgBeta = 0, avgEnergy = 0;
    let sinPhase = 0, cosPhase = 0; // For proper phase averaging
    
    for (let i = 0; i < numToUse; i++) {
      const snap = this.memorySnapshots[i];
      avgAlpha += snap.alpha;
      avgBeta += snap.beta;
      sinPhase += Math.sin(snap.phase);
      cosPhase += Math.cos(snap.phase);
      avgEnergy += snap.energy;
    }
    
    return {
      alpha: avgAlpha / numToUse,
      beta: avgBeta / numToUse,
      phase: Math.atan2(sinPhase / numToUse, cosPhase / numToUse),
      energy: avgEnergy / numToUse
    };
  }
}

export default DigitalQubit;