// Set up parameter sliders
export function setupControls(engine) {
  const biasSlider = document.getElementById('bias-slider');
  const decaySlider = document.getElementById('decay-slider');
  const lrSlider = document.getElementById('lr-slider');
  const feedbackSlider = document.getElementById('feedback-slider');

  // Initialize sliders to engine's initial values
  biasSlider.value = engine.bias * 100;
  decaySlider.value = engine.decay * 1000;
  lrSlider.value = engine.learningRate * 1000;
  feedbackSlider.value = engine.feedbackStrength * 100;

  // Add event listeners
  biasSlider.addEventListener('input', (e) => {
    const value = e.target.value / 100;
    engine.bias = value; // Allow manual override
    document.getElementById('bias-val').textContent = value.toFixed(2);
  });

  decaySlider.addEventListener('input', (e) => {
    const value = e.target.value / 1000;
    engine.decay = value; // Allow manual override
    document.getElementById('decay-val').textContent = value.toFixed(3);
  });

  lrSlider.addEventListener('input', (e) => {
    const value = e.target.value / 1000;
    engine.learningRate = value; // Allow manual override
    document.getElementById('lr-val').textContent = value.toFixed(3);
  });

  feedbackSlider.addEventListener('input', (e) => {
    const value = e.target.value / 100;
    engine.feedbackStrength = value; // Allow manual override
    document.getElementById('feedback-val').textContent = value.toFixed(2);
  });

  // Set up tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Update active tab
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show active content
      document.querySelectorAll('.tab-content').forEach(content => {
        if (content.dataset.tab === tabName) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });
}

// Update UI displays with current values (including auto-tuned ones)
export function updateDisplays(metrics, engine) {
  // Update metric displays
  document.getElementById('coherence-val').textContent = metrics.coherence.toFixed(3);
  document.getElementById('entropy-val').textContent = metrics.entropy.toFixed(3);
  document.getElementById('phase-val').textContent = metrics.phaseCoherence.toFixed(3);
  
  // Update memory counts - now counting snapshots distributed across qubits
  document.getElementById('mem-count').textContent = engine.totalSnapshots;
  document.getElementById('group-count').textContent = engine.memoryGroups.length;
  document.getElementById('evolution-count').textContent = engine.codeEvolutions;
  document.getElementById('calc-time').textContent = metrics.calcTime.toFixed(1);

  // Update parameter displays to reflect current engine values (which might be auto-tuned)
  document.getElementById('bias-val').textContent = engine.bias.toFixed(2);
  document.getElementById('decay-val').textContent = engine.decay.toFixed(3);
  document.getElementById('lr-val').textContent = engine.learningRate.toFixed(3);
  document.getElementById('feedback-val').textContent = engine.feedbackStrength.toFixed(2);

  // Update performance stats displays
  document.getElementById('learning-rate-val').textContent = engine.learningRate.toFixed(3);
  
  // Display network error if available
  if (metrics.networkError !== undefined) {
    const errorElement = document.getElementById('network-error');
    if (errorElement) {
      errorElement.textContent = metrics.networkError.toFixed(4);
    }
  }

  // Update metric bars
  document.getElementById('coherence-bar').style.width = `${metrics.coherence * 100}%`;
  document.getElementById('entropy-bar').style.width = `${metrics.entropy * 100}%`;
  document.getElementById('phase-bar').style.width = `${metrics.phaseCoherence * 100}%`;
}