// js/core/Metrics.js
// Functions for calculating quantum system metrics

/**
 * Calculate quantum coherence of the system.
 * Max coherence when |α|=|β|=1/√2.
 * @param {Array<DigitalQubit>} qubits - Array of qubits.
 * @returns {number} Average coherence (0 to 1).
 */
function calculateCoherence(qubits) {
    if (!qubits || qubits.length === 0) return 0;
    let coherenceSum = 0;
    qubits.forEach(q => {
        coherenceSum += Math.abs(q.alpha * q.beta) * 4;
    });
    return coherenceSum / qubits.length;
}

/**
 * Calculate von Neumann entropy analog for the system.
 * @param {Array<DigitalQubit>} qubits - Array of qubits.
 * @returns {number} Average entropy (0 to 1).
 */
function calculateEntropy(qubits) {
    if (!qubits || qubits.length === 0) return 0;
    let entropySum = 0;
    qubits.forEach(q => {
        const p = q.alpha * q.alpha;
        if (p > 0 && p < 1) {
            // Clamp p slightly away from 0 and 1 to avoid log2(0) -> -Infinity
            const pClamped = Math.max(1e-9, Math.min(1 - 1e-9, p));
            entropySum -= pClamped * Math.log2(pClamped) + (1 - pClamped) * Math.log2(1 - pClamped);
        }
    });
    // Normalize: Max entropy is 1 for a single qubit (when p=0.5)
    return entropySum / qubits.length;
}

/**
 * Calculate phase coherence (alignment) across qubits.
 * @param {Array<DigitalQubit>} qubits - Array of qubits.
 * @returns {number} Phase coherence (0 = random phases, 1 = aligned phases).
 */
function calculatePhaseCoherence(qubits) {
    if (!qubits || qubits.length === 0) return 0;
    let phaseSum = { x: 0, y: 0 };
    qubits.forEach(q => {
        phaseSum.x += Math.cos(q.phase);
        phaseSum.y += Math.sin(q.phase);
    });
    // Normalize the vector sum magnitude
    const magnitude = Math.sqrt(phaseSum.x * phaseSum.x + phaseSum.y * phaseSum.y) / qubits.length;
    return magnitude;
}

/**
 * Calculate all standard metrics for the engine.
 * @param {Array<DigitalQubit>} qubits - The array of qubits from the engine.
 * @returns {object} Object containing { coherence, entropy, phaseCoherence }.
 */
export function calculateMetrics(qubits) {
    return {
        coherence: calculateCoherence(qubits),
        entropy: calculateEntropy(qubits),
        phaseCoherence: calculatePhaseCoherence(qubits)
    };
}