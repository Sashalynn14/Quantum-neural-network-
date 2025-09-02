// js/core/SelfModifier.js
// Functions for code self-modification, evaluation, and generation.

import { DigitalQubit } from './DigitalQubit.js'; // Needed for potential code execution context
import { updateCodeHealthVisuals } from '../ui/CodeEditor.js'; // Needed for context
import * as THREE from 'three'; // Needed for context
import { scene, material, colArr } from '../visualization/Scene.js'; // Needed for context

/**
 * Evaluates the "health" of the current code based on performance metrics history.
 * @param {QuantumCognitiveEngine} engine - The engine instance.
 */
export function evaluateHealth(engine) {
    if (!engine.perfHistory || engine.perfHistory.length < 50) {
        engine.codeHealth = engine.codeHealth * 0.95 + 0.5 * 0.05; // Decay towards 0.5 if not enough data
        return;
    }

    const recent = engine.perfHistory.slice(-50);

    // Helper to calculate average of a key in the history array
    const avg = (arr, key) => arr.reduce((sum, p) => sum + (p[key] || 0), 0) / arr.length;
    // Helper to calculate variance
    const variance = (arr, mean) => arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;

    // Calculate stability (lower variance is better)
    const coherenceValues = recent.map(p => p.coherence);
    const coherenceMean = avg(coherenceValues, null); // Pass null as key for direct array avg
    const coherenceVariance = variance(coherenceValues, coherenceMean);

    // Calculate efficiency (lower calculation time is better)
    const calcTimes = recent.map(p => p.calcTime);
    const avgCalcTime = avg(calcTimes, null);
    const normalizedCalcTime = Math.min(1, avgCalcTime / 20); // Assume 20ms is a slow frame goal

    // Calculate target achievement
    const avgEntropy = avg(recent.map(p => p.entropy), null);
    const avgPhase = avg(recent.map(p => p.phaseCoherence), null);

    const targetDistance = Math.sqrt(
        Math.pow(coherenceMean - engine.targetCoherence, 2) +
        Math.pow(avgEntropy - engine.targetEntropy, 2) +
        Math.pow(avgPhase - engine.targetPhaseCoherence, 2)
    ) / Math.sqrt(3); // Normalize distance (max distance is sqrt(1^2+1^2+1^2))

    // Combine factors into overall health score (higher is better)
    const stabilityScore = 1 - Math.min(1, coherenceVariance * 10); // Scaled variance
    const efficiencyScore = 1 - normalizedCalcTime;
    const targetScore = 1 - targetDistance;

    // Weighted average for code health
    const newHealth = Math.max(0, Math.min(1, (stabilityScore * 0.3 + efficiencyScore * 0.3 + targetScore * 0.4)));

    // Smoothly update health
    engine.codeHealth = engine.codeHealth * 0.9 + newHealth * 0.1;
}


/**
 * Generates a potential code improvement suggestion.
 * @param {QuantumCognitiveEngine} engine - The engine instance.
 * @returns {string} Generated code string.
 */
export function generateImprovement(engine) {
    // Simple conceptual highlighting (actual highlighting needs editor support)
    const highlightCodeLine = (lineNumber) => {
        engine.codeEditingLines.add(lineNumber);
        if (engine.editingTimeout) clearTimeout(engine.editingTimeout);
        engine.editingTimeout = setTimeout(() => {
            engine.codeEditingLines.clear();
        }, 3000);
    };
    const lineNumbers = Math.random() < 0.5 ? [2, 5] : [3, 7];
    lineNumbers.forEach(highlightCodeLine);

    const improvements = [
        // Parameter Optimization
        `// Parameter Optimization - Line ${lineNumbers[0]}\nengine.learningRate = ${(engine.learningRate * (0.8 + Math.random() * 0.4)).toFixed(5)};\n// Adjusting targets slightly - Line ${lineNumbers[1]}\nengine.targetCoherence = ${(engine.targetCoherence * (0.95 + Math.random() * 0.1)).toFixed(2)};\nengine.targetEntropy = ${(engine.targetEntropy * (0.95 + Math.random() * 0.1)).toFixed(2)};`,

        // Memory Enhancement
        `// Memory Enhancement - Line ${lineNumbers[0]}\nengine.groupSize = ${Math.max(5, Math.min(50, Math.floor(engine.groupSize * (0.7 + Math.random() * 0.6))))};\n// Feedback strength based on health - Line ${lineNumbers[1]}\nengine.feedbackStrength = Math.min(0.9, Math.max(0.1, engine.codeHealth * 0.6 + 0.1));`,

        // Visual Tweaks
        `// Visual Tweaks - Line ${lineNumbers[0]}\nif (material) material.size = Math.max(1, ${Math.floor(5 + Math.random() * 5)} * Math.min(window.innerWidth, window.innerHeight) / 1000);\n// Adjust fog based on entropy - Line ${lineNumbers[1]}\nif (scene && scene.fog) scene.fog.density = 0.001 + (engine.entropyHistory.slice(-1)[0] || 0.5) * 0.0015;`,

        // Gate Logic Tweak (Example - Modifies DigitalQubit prototype)
        `// Gate Logic Tweak - Line ${lineNumbers[0]}\nDigitalQubit.prototype.applyGate = function(bias, decay) {\n  if (!this.history) this.history = []; this.history.push([this.alpha, this.beta, this.phase]);\n  if (this.history.length > 5) this.history.shift();\n  this.gateTime = Date.now();\n  const useHadamard = Math.random() < bias;\n  if (useHadamard) {\n    const a = this.alpha, b = this.beta, inv = 1/Math.sqrt(2);\n    this.alpha = (a + b) * inv;\n    this.beta = (a - b) * inv;\n    this.phase += Math.PI / 4;\n    this.gateApplied = 'H';\n  } else {\n    [this.alpha, this.beta] = [this.beta, this.alpha];\n    this.phase += Math.PI / 2;\n    this.gateApplied = 'X';\n  }\n  this.alpha += (Math.random() * 2 - 1) * decay;\n  this.beta += (Math.random() * 2 - 1) * decay;\n  this.phase += (Math.random() * 2 - 1) * decay * Math.PI;\n  this.energy = 0.5 + 0.5 * Math.sin(this.phase) * Math.abs(this.alpha - this.beta);\n  this.normalize();\n};`
    ];

    // Select improvement based on code health
    let index;
    if (engine.codeHealth < 0.4) {
        index = Math.random() < 0.7 ? 0 : 2;
    } else if (engine.codeHealth > 0.7) {
        index = Math.random() < 0.5 ? 3 : (Math.random() < 0.5 ? 1 : 0);
    } else {
        index = Math.floor(Math.random() * improvements.length);
    }
    return improvements[index];
}


/**
 * Safely applies a code modification and checks its immediate impact.
 * @param {QuantumCognitiveEngine} engine - The engine instance.
 * @param {string} code - The code string to apply.
 * @param {object} executionContext - Object containing context for the executed code (e.g., engine, THREE).
 * @returns {object} Result object { success: boolean, error?: string }.
 */
export function applyModification(engine, code, executionContext) {
    // Store current performance for comparison
    const currentHealth = engine.codeHealth;
    const lastPerf = engine.perfHistory.slice(-1)[0];
    const initialAvgCalcTime = lastPerf ? (engine.perfHistory.slice(-10).reduce((sum, p) => sum + p.calcTime, 0) / Math.min(10, engine.perfHistory.length)) : 20; // Use recent average or default

    try {
        // Use Function constructor for safer execution scope
        // Inject context variables into the function scope
        const contextKeys = Object.keys(executionContext);
        const contextValues = Object.values(executionContext);
        const modFunction = new Function(...contextKeys, code);

        // Execute the generated code with the provided context
        modFunction(...contextValues);

        // Evaluate immediate impact (optional, could rely solely on long-term health)
        // Let's do a quick check: Run a step and see if calc time drastically increased
        engine.step(); // Run one step to see immediate effect
        const newPerf = engine.perfHistory.slice(-1)[0];
        const newAvgCalcTime = engine.perfHistory.length >= 10 ? (engine.perfHistory.slice(-10).reduce((sum, p) => sum + p.calcTime, 0) / 10) : newPerf?.calcTime || initialAvgCalcTime * 1.5; // Allow some initial fluctuation


        // Basic check: did calculation time explode or health drop significantly?
        if (newAvgCalcTime > initialAvgCalcTime * 1.5) {
             console.warn("Code modification caused significant performance degradation. Reverting implicitly (by not saving).");
             // TODO: Could potentially add explicit revert logic here if needed
             return { success: false, error: "Performance degraded (Calc time increased >50%)" };
        }

        // If evaluation passed (or no immediate eval done), consider it successful for now
        // Long-term health evaluation will confirm if it was truly beneficial
        return { success: true };

    } catch (error) {
        console.error("Error applying code modification:", error);
        // Potentially revert changes here if state was mutated before error
        return { success: false, error: error.message };
    }
}