// Update scrolling chart visualizations
export function updateScrollingCharts(engine) {
  // Update coherence chart
  updateChart('coherence-chart', engine.coherenceHistory.slice(-30), '#00f3ff');
  
  // Update entropy chart
  updateChart('entropy-chart', engine.entropyHistory.slice(-30), '#00ff77');
  
  // Update learning chart
  updateLearningChart(engine);
}

// Helper function to update individual chart with responsive design
export function updateChart(chartId, data, color) {
  const chart = document.getElementById(chartId);
  if (!chart) return;
  
  // Get chart dimensions for proper scaling
  const width = chart.clientWidth;
  const height = chart.clientHeight;
  
  // Clear existing chart
  while (chart.firstChild) {
    chart.removeChild(chart.firstChild);
  }
  
  // Scale line width and gap based on available width
  const dataLength = data.length || 30;
  const lineWidth = Math.max(1, Math.min(3, Math.floor(width / 90)));
  const gap = Math.max(0, Math.floor((width - dataLength * lineWidth) / Math.max(1, dataLength - 1)));
  
  // Create new lines
  data.forEach((value, i) => {
    const line = document.createElement('div');
    line.className = 'chart-line';
    
    // Scale height based on value and available height
    const lineHeight = Math.min(height - 2, value * (height - 2));
    line.style.height = `${lineHeight}px`;
    
    // Position line with proper spacing
    line.style.left = `${i * (lineWidth + gap)}px`;
    line.style.width = `${lineWidth}px`;
    
    // Set color with opacity based on value
    const opacity = 0.6 + value * 0.4;
    line.style.background = color;
    line.style.opacity = opacity;
    
    chart.appendChild(line);
  });
}

// Initialize scrolling charts with empty state
export function initializeScrollingCharts() {
  const coherenceChart = document.getElementById('coherence-chart');
  const entropyChart = document.getElementById('entropy-chart');
  
  if (!coherenceChart || !entropyChart) return;
  
  // Get dimensions for proper scaling
  const coherenceWidth = coherenceChart.clientWidth;
  const entropyWidth = entropyChart.clientWidth;
  
  // Calculate optimal line width and spacing
  const coherenceLineWidth = Math.max(1, Math.floor(coherenceWidth / 90));
  const entropyLineWidth = Math.max(1, Math.floor(entropyWidth / 90));
  
  // Set up initial empty charts
  for (let i = 0; i < 30; i++) {
    // Coherence chart lines
    if (coherenceChart) {
      const coherenceLine = document.createElement('div');
      coherenceLine.className = 'chart-line';
      coherenceLine.style.left = `${i * (coherenceLineWidth + 1)}px`;
      coherenceLine.style.width = `${coherenceLineWidth}px`;
      coherenceLine.style.height = '0px';
      coherenceChart.appendChild(coherenceLine);
    }
    
    // Entropy chart lines
    if (entropyChart) {
      const entropyLine = document.createElement('div');
      entropyLine.className = 'chart-line';
      entropyLine.style.left = `${i * (entropyLineWidth + 1)}px`;
      entropyLine.style.width = `${entropyLineWidth}px`;
      entropyLine.style.height = '0px';
      entropyChart.appendChild(entropyLine);
    }
  }
}

// Update learning chart based on neural network error
export function updateLearningChart(engine) {
  if (!engine.learningCurve || engine.learningCurve.length === 0) return;
  
  // Get max error value for scaling (with a minimum to prevent divide-by-zero)
  const maxError = Math.max(0.001, ...engine.learningCurve);
  
  // Normalize data for chart (inverted since lower error = better)
  const normalizedData = engine.learningCurve.map(err => 
    Math.max(0, Math.min(1, 1 - (err / maxError)))
  );
  
  // Update chart with normalized data
  updateChart('learning-chart', normalizedData, '#ff5500');
  
  // Update error bar
  const errorBar = document.getElementById('error-bar');
  if (errorBar) {
    const currentError = engine.overallError || 0;
    // Inverse relationship - less error means fuller bar
    const errorFraction = Math.max(0, Math.min(1, 1 - (currentError / maxError)));
    errorBar.style.width = `${errorFraction * 100}%`;
  }
  
  // Update network stats
  const connectionCount = document.getElementById('connection-count');
  if (connectionCount) {
    connectionCount.textContent = engine.pairs ? engine.pairs.length : 0;
  }
  
  // Update layer counts
  if (engine.layerSizes) {
    const inputCount = document.getElementById('input-count');
    const hiddenCount = document.getElementById('hidden-count');
    const outputCount = document.getElementById('output-count');
    
    if (inputCount) inputCount.textContent = engine.layerSizes[0];
    if (hiddenCount) hiddenCount.textContent = engine.layerSizes[1];
    if (outputCount) outputCount.textContent = engine.layerSizes[2];
  }
}

// Resize charts when window is resized
export function resizeCharts() {
  const coherenceChart = document.getElementById('coherence-chart');
  const entropyChart = document.getElementById('entropy-chart');
  
  if (coherenceChart) {
    updateChart('coherence-chart', [], '#00f3ff');
  }
  
  if (entropyChart) {
    updateChart('entropy-chart', [], '#00ff77');
  }
}

// Add window resize listener
window.addEventListener('resize', debounce(resizeCharts, 250));

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}