// js/core/ParameterTuner.js
// Functions for adaptively tuning engine parameters based on metrics

/**
 * Adjusts engine parameters (bias, decay, learningRate, feedbackStrength) based on target metrics.
 * @param {QuantumCognitiveEngine} engine - The engine instance.
 * @param {object} metrics - Object containing current { coherence, entropy, phaseCoherence }.
 */
export function tuneParameters(engine, metrics) {
    const { coherence, entropy, phaseCoherence } = metrics;

    // Calculate deviations from target metrics (normalized error)
    // Avoid division by zero if target is zero
    const coherenceError = engine.targetCoherence > 0 ? (engine.targetCoherence - coherence) / engine.targetCoherence : (engine.targetCoherence - coherence);
    const entropyError = engine.targetEntropy > 0 ? (engine.targetEntropy - entropy) / engine.targetEntropy : (engine.targetEntropy - entropy);
    const phaseError = engine.targetPhaseCoherence > 0 ? (engine.targetPhaseCoherence - phaseCoherence) / engine.targetPhaseCoherence : (engine.targetPhaseCoherence - phaseCoherence);

    // Calculate overall error magnitude (Root Mean Square Error of normalized deviations)
    const meanSquaredError = (coherenceError**2 + entropyError**2 + phaseError**2) / 3;
    const rmse = Math.sqrt(meanSquaredError);

    // --- Parameter Adjustment Logic ---

    // Bias: Increase bias if coherence or phase coherence is too low (encourages Hadamard-like gates).
    //       Decrease bias if coherence or phase coherence is too high (allows more X-gates).
    // Use absolute error for direction, scaled by learning rate.
    engine.bias += (coherenceError + phaseError) * engine.learningRate * 0.1; // Slower adjustment for bias

    // Decay: Increase decay if entropy is too low (introduces more randomness/decoherence).
    //        Decrease decay if entropy is too high (reduces noise).
    // Use absolute error for direction, scaled by learning rate.
    engine.decay += entropyError * engine.learningRate * 0.05; // Even slower adjustment for decay

    // Learning Rate: Adjust based on overall error. If error is large, increase LR slightly to adapt faster.
    //                If error is small, decrease LR slightly for fine-tuning and stability.
    // Use a target error level (e.g., 0.1 or 10%) to decide whether to increase/decrease.
    const targetRMSE = 0.1;
    if (rmse > targetRMSE * 1.5) { // Significantly larger error than target
        engine.learningRate *= 1.005; // Increase LR slowly
    } else if (rmse < targetRMSE * 0.5) { // Significantly smaller error
        engine.learningRate *= 0.998; // Decrease LR slowly
    }
    // Add a very small random walk to LR to prevent getting stuck
    engine.learningRate += (Math.random() - 0.5) * 0.00001;


    // Feedback Strength: Adjust based on convergence and stability.
    // If error is high (rmse > targetRMSE), increase feedback slightly to utilize memory more.
    // If error is low but metrics are oscillating (high variance - requires tracking variance), decrease feedback.
    // Simple approach for now: Increase feedback slightly if error is high, decrease if low.
    if (rmse > targetRMSE) {
         engine.feedbackStrength += 0.001 * engine.learningRate * (rmse - targetRMSE); // Increase feedback proportionally to how much error exceeds target
    } else {
         engine.feedbackStrength -= 0.0005 * engine.learningRate * (targetRMSE - rmse); // Decrease feedback proportionally to how much error is below target
    }
     // Add a very small random walk to feedback strength
    engine.feedbackStrength += (Math.random() - 0.5) * 0.001;


    // --- Parameter Clamping ---
    // Ensure parameters stay within reasonable bounds.
    engine.bias = Math.min(Math.max(engine.bias, 0.01), 0.99);
    engine.decay = Math.min(Math.max(engine.decay, 0.0001), 0.05); // Lower min decay bound
    // Removed upper limit clamp for learning rate, only enforce minimum
    engine.learningRate = Math.max(engine.learningRate, 0.0001);
    engine.feedbackStrength = Math.min(Math.max(engine.feedbackStrength, 0.0), 0.95); // Clamp feedback

    // --- Optional: Target Shifting (Advanced) ---
    // Example: If the system is very stable (low metric variance) but performance (calcTime) is high,
    // maybe slightly lower the targetCoherence or targetPhaseCoherence to allow for less computational strain.
    // This requires tracking variance and performance metrics more closely.
    // if (engine.perfHistory.length > 50) {
    //     const recentPerf = engine.perfHistory.slice(-50);
    //     const calcTimes = recentPerf.map(p => p.calcTime);
    //     const avgCalcTime = calcTimes.reduce((s, t) => s + t, 0) / calcTimes.length;
    //     // Example: if calc time is high (> 15ms) and variance is low, slightly reduce phase target
    //     // const phaseVariance = calculateVariance(recentPerf.map(p => p.phaseCoherence));
    //     // if (avgCalcTime > 15 && phaseVariance < 0.01) {
    //     //    engine.targetPhaseCoherence *= 0.999;
    //     //    engine.targetPhaseCoherence = Math.max(0.1, engine.targetPhaseCoherence); // Clamp target
    //     // }
    // }
}

// Helper function to calculate variance (if needed for advanced tuning)
// function calculateVariance(data) {
//     if (!data || data.length < 2) return 0;
//     const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
//     const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
//     return variance;
// }