import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Exported objects for use in other modules
export let scene, camera, renderer, controls;
export let material, particleMaterial, ambientMaterial;
export let pointsMesh, linesMesh, ambientPointsMesh;
export let memorySpheres = [];

// Geometry data for particles and lines
export let posArr, colArr, sizeArr, geom;
export let linePositions, lineColors, lineGeom;

// Shared colors for consistency
const baseFogColor = new THREE.Color(0x050510);
const baseBackgroundColor = new THREE.Color(0x050510);
let viewportBounds = { width: 0, height: 0 };

// Initialize the 3D scene
export function initScene() {
  // Scene setup
  scene = new THREE.Scene();
  scene.background = baseBackgroundColor.clone();
  scene.fog = new THREE.FogExp2(baseFogColor.getHex(), 0.001);

  // Update viewport size
  viewportBounds = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  // Camera setup - use dynamic FOV based on screen dimensions
  const aspectRatio = viewportBounds.width / viewportBounds.height;
  const baseFOV = 60;
  // Adjust FOV for very wide or tall screens to maintain consistent view
  const fov = aspectRatio > 2 ? baseFOV * 0.8 : (aspectRatio < 0.5 ? baseFOV * 1.2 : baseFOV);
  
  camera = new THREE.PerspectiveCamera(fov, aspectRatio, 0.1, 2000);
  
  // Adjust camera position based on screen dimensions
  const zPosition = 300 * (aspectRatio > 1.5 ? 1.1 : (aspectRatio < 0.7 ? 0.9 : 1));
  camera.position.z = zPosition;

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(viewportBounds.width, viewportBounds.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
  document.body.appendChild(renderer.domElement);

  // Add orbital controls with adaptive bounds
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.maxDistance = Math.min(800, viewportBounds.width * 1.5); // Limit based on screen size
  controls.minDistance = Math.max(50, viewportBounds.width * 0.1);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;

  // Create particle texture with glow
  const particleCanvas = document.createElement('canvas');
  particleCanvas.width = 64;
  particleCanvas.height = 64;
  const ctx = particleCanvas.getContext('2d');

  // Create radial gradient for particle texture
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(200, 255, 255, 0.9)');
  gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.5)');
  gradient.addColorStop(1, 'rgba(0, 100, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const particleTexture = new THREE.CanvasTexture(particleCanvas);

  // Handle window resize - comprehensive update
  window.addEventListener('resize', () => {
    // Update viewport dimensions
    viewportBounds = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    // Update camera and renderer
    camera.aspect = viewportBounds.width / viewportBounds.height;
    
    // Adjust FOV on extreme aspect ratios
    const aspectRatio = viewportBounds.width / viewportBounds.height;
    if (aspectRatio > 2) {
      camera.fov = baseFOV * 0.8;
    } else if (aspectRatio < 0.5) {
      camera.fov = baseFOV * 1.2;
    }
    
    camera.updateProjectionMatrix();
    
    // Update renderer size
    renderer.setSize(viewportBounds.width, viewportBounds.height);
    
    // Update controls bounds
    controls.maxDistance = Math.min(800, viewportBounds.width * 1.5);
    controls.minDistance = Math.max(50, viewportBounds.width * 0.1);
    
    // Update UI positioning
    updateUIPositioning();
  });
  
  return particleTexture;
}

// Update UI element positioning for responsive layout
function updateUIPositioning() {
  // Get current viewport dimensions
  const width = viewportBounds.width;
  const height = viewportBounds.height;
  
  // Info panel - keep in top left with margin based on screen size
  const infoPanel = document.getElementById('info');
  if (infoPanel) {
    infoPanel.style.top = `${Math.max(10, height * 0.02)}px`;
    infoPanel.style.left = `${Math.max(10, width * 0.02)}px`;
    // Adjust width based on screen size (prevent overflow on small screens)
    infoPanel.style.maxWidth = `${Math.min(300, width * 0.3)}px`;
  }
  
  // Memory panel - keep in top right
  const memoryPanel = document.getElementById('memory-panel');
  if (memoryPanel) {
    memoryPanel.style.top = `${Math.max(10, height * 0.02)}px`;
    memoryPanel.style.right = `${Math.max(10, width * 0.02)}px`;
    // Adjust height based on screen size
    memoryPanel.style.height = `${Math.min(300, height * 0.5)}px`;
  }
  
  // Code editor - keep in bottom right
  const codeEditor = document.getElementById('code-editor');
  if (codeEditor) {
    codeEditor.style.bottom = `${Math.max(10, height * 0.02)}px`;
    codeEditor.style.right = `${Math.max(10, width * 0.02)}px`;
    // Adjust width based on screen size
    codeEditor.style.width = `${Math.min(350, width * 0.4)}px`;
    codeEditor.style.maxHeight = `${Math.min(300, height * 0.4)}px`;
  }
}

// Set up all visualization components with responsive scaling
export function setupVisualizations(engine) {
  const particleTexture = initScene();
  const N = engine.qubits.length; 
  
  // Scale factors based on viewport size for cohesive look
  const viewScale = Math.min(viewportBounds.width, viewportBounds.height) / 1000;
  const particleSize = 8 * viewScale * (viewportBounds.width > 768 ? 1 : 0.8);
  const torusScale = Math.min(viewportBounds.width, viewportBounds.height) / 10;
  
  // Particle system for qubits
  posArr = new Float32Array(N * 3);
  sizeArr = new Float32Array(N);
  colArr = new Float32Array(N * 3);
  geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizeArr, 1));

  material = new THREE.PointsMaterial({
    size: particleSize,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: particleTexture,
    alphaTest: 0.01,
    sizeAttenuation: true
  });

  pointsMesh = new THREE.Points(geom, material);
  scene.add(pointsMesh);

  // Lines for quantum connections
  const maxLineCount = (engine.pairs ? engine.pairs.length : 0) + 
                      (engine.clusters ? engine.clusters.length * 6 : 0) +
                      (engine.superClusters ? engine.superClusters.length * 28 : 0); 
  linePositions = new Float32Array(maxLineCount * 2 * 3);
  lineColors = new Float32Array(maxLineCount * 2 * 3);
  lineGeom = new THREE.BufferGeometry();
  lineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeom.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
  
  const lineMat = new THREE.LineBasicMaterial({ 
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    linewidth: 1.5
  });
  
  linesMesh = new THREE.LineSegments(lineGeom, lineMat);
  scene.add(linesMesh);

  // Memory visualization spheres - position relative to viewport
  const memoryGeom = new THREE.SphereGeometry(4, 16, 16);
  const memoryMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff, 
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    wireframe: true
  });
  
  // Position memory spheres within viewport bounds
  const memoryDepth = viewportBounds.width < 768 ? -150 : -200;
  const memorySpacing = viewportBounds.width < 768 ? 10 : 15;
  
  for (let i = 0; i < 20; i++) {
    const sphere = new THREE.Mesh(memoryGeom, memoryMat.clone());
    sphere.position.set(0, 0, memoryDepth - i * memorySpacing);
    sphere.scale.set(0.1, 0.1, 0.1);
    sphere.visible = false;
    scene.add(sphere);
    memorySpheres.push(sphere);
  }

  // Add ambient particle effects
  setupAmbientParticles(particleTexture);
  
  // Position UI elements
  updateUIPositioning();
  
  // Return configured view scale for other components to use
  return { viewScale, torusScale };
}

// Set up ambient background particles with bounds checking
function setupAmbientParticles(particleTexture) {
  const ambientParticles = new THREE.BufferGeometry();
  
  // Scale particle count by screen size
  const particleCount = Math.min(300, Math.max(100, Math.floor(viewportBounds.width * viewportBounds.height / 3000)));
  
  const ambientPositions = new Float32Array(particleCount * 3);
  const ambientColors = new Float32Array(particleCount * 3);
  const ambientSizes = new Float32Array(particleCount);

  // Calculate bounds based on viewport
  const boundRadius = Math.min(viewportBounds.width, viewportBounds.height) * 0.8;
  const boundHeight = boundRadius * 0.7;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = (100 + Math.random() * boundRadius) * 0.8;
    const height = (Math.random() - 0.5) * boundHeight;
    
    ambientPositions[i * 3] = Math.cos(angle) * radius;
    ambientPositions[i * 3 + 1] = Math.sin(angle) * radius;
    ambientPositions[i * 3 + 2] = height;
    
    const hue = 0.5 + Math.random() * 0.15;
    const color = new THREE.Color().setHSL(hue, 1, 0.5 + Math.random() * 0.2);
    ambientColors[i * 3] = color.r;
    ambientColors[i * 3 + 1] = color.g;
    ambientColors[i * 3 + 2] = color.b;
    
    // Scale particle sizes with screen dimensions
    const sizeScale = viewportBounds.width < 768 ? 0.8 : 1;
    ambientSizes[i] = (Math.random() * 4 + 1) * sizeScale;
  }

  ambientParticles.setAttribute('position', new THREE.BufferAttribute(ambientPositions, 3));
  ambientParticles.setAttribute('color', new THREE.BufferAttribute(ambientColors, 3));
  ambientParticles.setAttribute('size', new THREE.BufferAttribute(ambientSizes, 1));

  ambientMaterial = new THREE.PointsMaterial({
    size: 3 * (viewportBounds.width < 768 ? 0.8 : 1),
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: particleTexture,
    sizeAttenuation: true
  });

  ambientPointsMesh = new THREE.Points(ambientParticles, ambientMaterial);
  scene.add(ambientPointsMesh);
}

// Update global effects like fog, background, rotation based on metrics
export function updateGlobalEffects(metrics, engine) {
  const coherence = metrics.coherence || 0;
  const entropy = metrics.entropy || 0;
  const phaseCoherence = metrics.phaseCoherence || 0;

  // Adjust fog density based on entropy (more chaos = denser fog)
  const targetFogDensity = 0.001 + entropy * 0.0015;
  scene.fog.density += (targetFogDensity - scene.fog.density) * 0.05;

  // Adjust background color slightly based on phase coherence
  const targetBackgroundColor = baseBackgroundColor.clone().lerp(new THREE.Color(0x102040), phaseCoherence * 0.5);
  scene.background.lerp(targetBackgroundColor, 0.05);

  // Adjust auto-rotate speed based on coherence
  const targetRotateSpeed = 0.3 + coherence * 0.5;
  controls.autoRotateSpeed += (targetRotateSpeed - controls.autoRotateSpeed) * 0.05;

  // Subtle pulsing effect on ambient particles
  if (ambientMaterial) {
    const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.1 * (metrics.calcTime / 10);
    ambientMaterial.size = 3 * (viewportBounds.width < 768 ? 0.8 : 1) * pulse;
    ambientMaterial.opacity = 0.4 * (1 + Math.sin(Date.now() * 0.002 + Math.PI/2) * 0.2);
  }
}

// Utility function to get viewport bounds for other components
export function getViewportBounds() {
  return viewportBounds;
}