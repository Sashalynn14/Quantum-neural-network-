// js/core/MemoryManager.js
// Functions for managing memory snapshots, grouping, and recall

import { createMemoryRecallRipple } from '../visualization/Effects.js';

/**
 * Manages memory: now snapshot creation happens in qubits directly
 * This function is primarily for creating memory groups and analytics
 * @param {QuantumCognitiveEngine} engine - The engine instance.
 */
export function manageMemory(engine) {
  // Snapshots now happen in applyGate() directly within each qubit
  // This function now just creates memory groups and updates statistics
  
  // Update engine stats for memory tracking (now distributed across qubits)
  engine.totalSnapshots = engine.qubits.reduce((sum, q) => sum + q.memorySnapshots.length, 0);
  
  // Create memory groups based on average state across qubits at specific time periods
  // Do this periodically to avoid overhead every frame
  if (engine.totalSnapshots > 0 && Date.now() - engine.lastMemoryGroupTime > 2000) {
    engine.lastMemoryGroupTime = Date.now();
    
    // Create a new memory group based on averaging the most recent state of all qubits
    const groupSnapshot = [];
    
    // For each qubit, get its most recent snapshot
    engine.qubits.forEach(qubit => {
      if (qubit.memorySnapshots.length > 0) {
        const recentSnap = qubit.memorySnapshots[0];
        groupSnapshot.push({
          id: engine.qubits.indexOf(qubit),
          alpha: recentSnap.alpha,
          beta: recentSnap.beta,
          phase: recentSnap.phase,
          energy: recentSnap.energy
        });
      }
    });
    
    if (groupSnapshot.length > 0) {
      engine.memoryGroups.push({
        timestamp: Date.now(),
        states: groupSnapshot,
        coherence: engine.coherenceHistory[engine.coherenceHistory.length - 1] || 0,
        entropy: engine.entropyHistory[engine.entropyHistory.length - 1] || 0
      });
    }
  }
}

/**
 * Recalls a random memory snapshot and applies feedback to the current state.
 * Now works with memory distributed across qubits.
 * @param {QuantumCognitiveEngine} engine - The engine instance.
 */
export function recallMemory(engine) {
  if (engine.feedbackStrength <= 0) return;
  
  const recallType = Math.random(); // Randomly select recall strategy
  
  if (recallType < 0.3) {
    // Global recall - all qubits recall from the same relative point in time
    const relativeIndex = Math.floor(Math.random() * 20); // Use recent memory
    let recallCount = 0;
    
    engine.qubits.forEach(qubit => {
      if (qubit.memorySnapshots.length > relativeIndex) {
        qubit.mixWithSnapshot(relativeIndex, engine.feedbackStrength);
        recallCount++;
      }
    });
    
    if (recallCount > engine.qubits.length * 0.3) {
      // Show visual effect if enough qubits recalled successfully
      engine.lastRecallTime = Date.now();
      engine.lastRecalledIndex = relativeIndex;
      createMemoryRecallRipple();
    }
  } 
  else if (recallType < 0.6) {
    // Layer-specific recall - only qubits in certain layers recall
    const targetLayer = Math.floor(Math.random() * 3); // Randomly select a layer
    let recallCount = 0;
    
    engine.qubits.forEach(qubit => {
      if (qubit.layer === targetLayer && qubit.memorySnapshots.length > 0) {
        // Use a random depth for more interesting patterns
        const depth = Math.floor(Math.random() * Math.min(10, qubit.memorySnapshots.length));
        qubit.mixWithSnapshot(depth, engine.feedbackStrength);
        recallCount++;
      }
    });
    
    if (recallCount > 0) {
      engine.lastRecallTime = Date.now();
      engine.lastRecalledIndex = -1 - targetLayer; // Negative values indicate layer-based recall
      createMemoryRecallRipple();
    }
  }
  else {
    // Individual recall - each qubit independently recalls a memory
    let recallCount = 0;
    
    engine.qubits.forEach(qubit => {
      if (qubit.memorySnapshots.length > 0 && Math.random() < 0.4) {
        const depth = Math.floor(Math.random() * Math.min(20, qubit.memorySnapshots.length));
        qubit.mixWithSnapshot(depth, engine.feedbackStrength * (0.5 + Math.random() * 0.5));
        recallCount++;
      }
    });
    
    if (recallCount > engine.qubits.length * 0.2) {
      engine.lastRecallTime = Date.now();
      engine.lastRecalledIndex = -5; // Special value for individual recall
      createMemoryRecallRipple();
    }
  }
}