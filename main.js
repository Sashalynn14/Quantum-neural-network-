import * as THREE from 'three';
import { QuantumCognitiveEngine } from './core/CognitiveEngine.js'; 
import { setupVisualizations, scene, camera, renderer, controls, updateGlobalEffects } from './visualization/Scene.js';
import { updateParticles, updateQuantumConnections, updateMemorySpheres, updateAmbientParticles, setScalingFactors } from './visualization/Particles.js';
import { updateFpsCounter, createMemoryStreamParticle } from './visualization/Effects.js';
import { setupControls, updateDisplays } from './ui/Controls.js';
import { initializeScrollingCharts, resizeCharts } from './ui/Charts.js';
import { setupCodeEditor } from './ui/CodeEditor.js';

// Initialize the cognitive engine
const engine = new QuantumCognitiveEngine();
let currentMetrics = { coherence: 0, entropy: 0, phaseCoherence: 0, calcTime: 0 }; // Store latest metrics

// Initialize all systems
function init() {
  // Set up Three.js visualization components
  const scalingFactors = setupVisualizations(engine);
  
  // Pass scaling factors to particles system
  setScalingFactors(scalingFactors);
  
  // Set up UI controls
  setupControls(engine);
  
  // Initialize scrolling charts
  initializeScrollingCharts();
  
  // Set up code editor functionality
  setupCodeEditor(engine);
  
  // Handle window resizing
  window.addEventListener('resize', debounce(() => {
    // Charts already have resize handler
    // Update engine if needed based on new dimensions
    adjustEngineToViewport();
  }, 250));
  
  // Initial viewport adjustment
  adjustEngineToViewport();
  
  // Start animation loop
  animate(0);
}

// Adjust engine parameters based on viewport size
function adjustEngineToViewport() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Adjust animation speed/complexity based on device capability
  // Access qubits directly from engine
  if (engine.qubits && engine.qubits.length > 0) {
    if (width < 768) {
      // Mobile/small screen - optimize for performance
      engine.qubits.forEach(q => q.animationScale = 0.7);
      
      // Reduce effect complexity on low-power devices
      engine.visualEffectComplexity = 0.5;
    } else {
      // Desktop - full experience
      engine.qubits.forEach(q => q.animationScale = 1.0);
      engine.visualEffectComplexity = 1.0;
    }
  }
}

// Animation loop
let lastTime = 0;
let frameSkipCounter = 0;
const frameSkipThreshold = 3; // Skip frames if performance issues detected

function animate(time) {
  requestAnimationFrame(animate);
  
  // Update FPS counter
  updateFpsCounter(time);
  
  // Adaptive performance: if FPS drops below threshold, start skipping calculations
  // on some frames to maintain visual smoothness
  const timeDelta = time - lastTime;
  // Use a slightly more lenient threshold for low performance detection
  const lowPerformance = timeDelta > 35; // Less than ~28fps
  
  // Skip calculation on some frames if performance is low
  if (lowPerformance) {
    frameSkipCounter++;
    if (frameSkipCounter < frameSkipThreshold) {
      // On skipped frames, just render visuals without new calculation
      renderer.render(scene, camera);
      return;
    }
    frameSkipCounter = 0;
  } else {
    frameSkipCounter = 0;
  }
  
  // Always update controls for smooth camera motion
  controls.update();
  
  // Update ambient particle effects - these are lightweight
  updateAmbientParticles(time);
  
  // Run engine simulation at target rate (approx 60fps when possible, or less if performance is low)
  if (time - lastTime > 16.67 || lowPerformance) { // ~60fps target for calculation
    currentMetrics = engine.step(); // Store metrics from the step
    updateDisplays(currentMetrics, engine);
    lastTime = time;
  }
  
  // Update visual components
  updateParticles(engine, time);
  updateQuantumConnections(engine);
  updateMemorySpheres(engine, time);

  // Update global visual effects based on metrics
  updateGlobalEffects(currentMetrics, engine);
  
  // Render scene
  renderer.render(scene, camera);
}

// Debounce helper for resize events
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Initialize everything
init();