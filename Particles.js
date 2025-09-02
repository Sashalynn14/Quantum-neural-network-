import * as THREE from 'three';
import { 
  scene, camera, material, 
  posArr, colArr, sizeArr, geom, 
  linePositions, lineColors, lineGeom,
  pointsMesh, linesMesh, memorySpheres,
  ambientPointsMesh, getViewportBounds
} from './Scene.js';
import { createGatePulse } from './Effects.js';

// Scale factors for responsive design
let viewScale = 1;
let torusScale = 100;

// Set scaling factors for responsive animations
export function setScalingFactors(scale) {
  viewScale = scale.viewScale || 1;
  torusScale = scale.torusScale || 100;
}

// Update the quantum particle system
export function updateParticles(engine, time) {
  // Get viewport dimensions
  const viewport = getViewportBounds ? getViewportBounds() : { width: window.innerWidth, height: window.innerHeight };
  const aspectRatio = viewport.width / viewport.height;
  
  // Adjust torus dimensions to fit viewport
  const radiusScale = Math.min(1, Math.max(0.7, aspectRatio * 0.6));
  const majorRadius = torusScale * radiusScale;
  const minorRadius = majorRadius * 0.2;
  
  // Update particles based on quantum state
  const pos = geom.attributes.position.array;
  const col = geom.attributes.color.array;
  const sizes = geom.attributes.size.array;
  
  // Network layer positioning
  const layerSpacing = 80 * radiusScale;
  const layerRadius = [
    majorRadius * 0.7,  // Input layer (smaller radius)
    majorRadius,        // Hidden layer (main radius)
    majorRadius * 0.7   // Output layer (smaller radius)
  ];
  
  // Access qubits directly from engine
  engine.qubits.forEach((q, i) => { 
    // Get Bloch sphere coordinates for true quantum representation
    const [bx, by, bz] = q.getBlochCoordinates();
    
    // Determine qubit position based on neural network layer
    let x, y, z;
    
    // Calculate position based on layer
    if (q.layer !== undefined) {
      // Get number of neurons in this layer
      const layerSize = engine.layerSizes[q.layer];
      
      // Calculate angle based on position in the layer
      const layerAngle = (q.neuronIndex / layerSize) * Math.PI * 2;
      
      // Calculate position in a circle for this layer
      const currentRadius = layerRadius[q.layer];
      x = Math.cos(layerAngle) * currentRadius;
      y = Math.sin(layerAngle) * currentRadius;
      
      // Z-position separates the layers
      z = (q.layer - 1) * layerSpacing; 
      
      // Add some quantum state influence and wobble
      const quantumOffset = 15 * Math.abs(bz);
      x += bx * quantumOffset;
      y += by * quantumOffset;
      z += (Math.sin(time * 0.0008 + i * 0.15) * 15 * q.energy);
    } else {
      // Legacy positioning for non-network qubits
      const ang = engine.angles[i] + time * 0.0002 * (1 + q.energy * 2);
      const r1 = majorRadius + bz * (minorRadius * 1.5);
      const r2 = minorRadius + Math.sqrt(bx*bx + by*by) * minorRadius * 1.5;
      
      x = Math.cos(ang) * r1 + Math.cos(ang * 2) * r2 * bx;
      y = Math.sin(ang) * r1 + Math.sin(ang * 2) * r2 * by;
      z = bz * 50 * radiusScale + Math.sin(time * 0.0008 + i * 0.15) * 15 * q.energy;
    }
    
    // Smoothly interpolate position for less jitter
    pos[3*i] += (x + q.dispX - pos[3*i]) * 0.1;
    pos[3*i+1] += (y + q.dispY - pos[3*i+1]) * 0.1;
    pos[3*i+2] += (z - pos[3*i+2]) * 0.1;
    
    // Calculate color based on layer and activation
    let hue, saturation, lightness;
    
    if (q.layer !== undefined) {
      // Layer-based coloring
      switch(q.layer) {
        case 0: // Input layer - blue-cyan
          hue = 0.55 + 0.1 * q.activation;
          break;
        case 1: // Hidden layer - purple-magenta
          hue = 0.7 + 0.1 * q.activation;
          break;
        case 2: // Output layer - red-orange
          hue = 0.05 + 0.1 * q.activation;
          break;
        default:
          hue = (q.phase / (2 * Math.PI));
      }
      
      // Activation affects brightness
      saturation = 0.6 + 0.4 * q.activation;
      lightness = 0.4 + 0.5 * q.activation;
    } else {
      // Legacy coloring for non-network qubits
      hue = (q.phase / (2 * Math.PI));
      saturation = 0.6 + 0.4 * Math.abs(q.alpha - q.beta);
      lightness = 0.4 + 0.5 * q.energy;
    }
    
    // Convert HSL to RGB and smoothly interpolate color
    const targetColor = new THREE.Color().setHSL(hue, saturation, lightness);
    col[3*i] += (targetColor.r - col[3*i]) * 0.1;
    col[3*i+1] += (targetColor.g - col[3*i+1]) * 0.1;
    col[3*i+2] += (targetColor.b - col[3*i+2]) * 0.1;
    
    // Particle size based on activation, energy and layer - scale with viewport
    const baseSize = 6 * viewScale;
    const layerSizeMultiplier = q.layer === 1 ? 1.0 : 1.2; // Make input/output slightly larger
    const activationBoost = q.activation * 4 * viewScale;
    const gateEffect = q.gateApplied && (Date.now() - q.gateTime < 600) ? 
                       Math.max(0, Math.sin(Math.PI * (1 - (Date.now() - q.gateTime) / 600))) * 8 * viewScale : 0;
    
    sizes[i] = baseSize * layerSizeMultiplier + activationBoost + q.energy * 4 * viewScale + gateEffect;

    // Create visual pulse when gate is applied
    if (q.gateApplied && (Date.now() - q.gateTime < 50)) {
      // Convert 3D coordinates to screen coordinates
      const vector = new THREE.Vector3(pos[3*i], pos[3*i+1], pos[3*i+2]);
      vector.project(camera);
      
      const x = (vector.x * 0.5 + 0.5) * viewport.width;
      const y = (vector.y * -0.5 + 0.5) * viewport.height;
      
      // Only create pulse if it's within viewport
      if (x >= 0 && x <= viewport.width && y >= 0 && y <= viewport.height) {
        createGatePulse(x, y, q.gateApplied);
      }
      q.gateApplied = ''; // Reset so we don't create multiple pulses
    }
    
    // Add small displacement for particle motion
    q.dispX *= 0.95;
    q.dispY *= 0.95;
    q.dispX += (Math.random() - 0.5) * 0.5 * q.energy;
    q.dispY += (Math.random() - 0.5) * 0.5 * q.energy;
  });
  
  geom.attributes.position.needsUpdate = true;
  geom.attributes.color.needsUpdate = true;
  geom.attributes.size.needsUpdate = true;
}

// Update connections between qubits based on entanglement
export function updateQuantumConnections(engine) {
  const positions = lineGeom.attributes.position.array;
  const colors = lineGeom.attributes.color.array;
  const particlePositions = geom.attributes.position.array;
  let lineIndex = 0;
  
  // Update pair lines
  if (engine.pairs) {
    engine.pairs.forEach(([i, j]) => {
      if (i >= engine.qubits.length || j >= engine.qubits.length) return;
      
      const entanglement = engine.entanglementMap.get(`${i}-${j}`) || 0;
      
      if (entanglement > 0.1) { // Only draw lines for significant entanglement
        const p1 = new THREE.Vector3(
          particlePositions[3*i], 
          particlePositions[3*i+1], 
          particlePositions[3*i+2]
        );
        const p2 = new THREE.Vector3(
          particlePositions[3*j], 
          particlePositions[3*j+1], 
          particlePositions[3*j+2]
        );
        
        // Set positions
        positions[lineIndex * 6 + 0] = p1.x;
        positions[lineIndex * 6 + 1] = p1.y;
        positions[lineIndex * 6 + 2] = p1.z;
        positions[lineIndex * 6 + 3] = p2.x;
        positions[lineIndex * 6 + 4] = p2.y;
        positions[lineIndex * 6 + 5] = p2.z;
        
        // Determine line color based on the layers being connected
        let color;
        
        // Get source and target qubits to determine layer connection type
        const sourceQubit = engine.qubits[i];
        const targetQubit = engine.qubits[j];
        
        if (sourceQubit && targetQubit && 
            sourceQubit.layer !== undefined && targetQubit.layer !== undefined) {
          // Input -> Hidden connection: blue to purple gradient
          if (sourceQubit.layer === 0 && targetQubit.layer === 1) {
            color = new THREE.Color(0x5588ff).lerp(
              new THREE.Color(0xbb66ff), 
              entanglement
            );
          }
          // Hidden -> Output connection: purple to orange gradient
          else if (sourceQubit.layer === 1 && targetQubit.layer === 2) {
            color = new THREE.Color(0xbb66ff).lerp(
              new THREE.Color(0xff9944), 
              entanglement
            );
          }
          // Other connections: standard cyan gradient
          else {
            color = new THREE.Color(0x00ffff).lerp(
              new THREE.Color(0xffffff), 
              entanglement * 1.5 - 0.5
            );
          }
        } else {
          // Default cyan gradient for backward compatibility
          color = new THREE.Color(0x00ffff).lerp(
            new THREE.Color(0xffffff), 
            entanglement * 1.5 - 0.5
          );
        }
        
        // Set the color and make it brighter based on entanglement
        colors[lineIndex * 6 + 0] = color.r;
        colors[lineIndex * 6 + 1] = color.g;
        colors[lineIndex * 6 + 2] = color.b;
        colors[lineIndex * 6 + 3] = color.r;
        colors[lineIndex * 6 + 4] = color.g;
        colors[lineIndex * 6 + 5] = color.b;
        
        lineIndex++;
      }
    });
  }
  
  // Pad the rest of the line buffers if needed
  const maxLineCount = linePositions.length / 6;
  for (let i = lineIndex; i < maxLineCount; i++) {
      positions[i * 6 + 0] = 0;
      positions[i * 6 + 1] = 0;
      positions[i * 6 + 2] = 0;
      positions[i * 6 + 3] = 0;
      positions[i * 6 + 4] = 0;
      positions[i * 6 + 5] = 0;
  }

  lineGeom.setDrawRange(0, lineIndex * 2); // Important: Only draw active lines
  lineGeom.attributes.position.needsUpdate = true;
  lineGeom.attributes.color.needsUpdate = true;
}

// Update memory sphere visualizations based on qubit memory
export function updateMemorySpheres(engine, time) {
  const viewport = getViewportBounds ? getViewportBounds() : { width: window.innerWidth, height: window.innerHeight };
  const maxSpheres = memorySpheres.length;
  const depthScale = viewport.width < 768 ? 0.75 : 1;
  
  // Update positions based on memory snapshots in qubits
  const now = Date.now();
  const recallFade = Math.max(0, 1 - (now - engine.lastRecallTime) / 1500); // Fade over 1.5s
  const recalledIndex = engine.lastRecalledIndex;
  
  // Group snapshots by time buckets for visualization
  const timeBuckets = Array(maxSpheres).fill(0);
  const bucketSize = 1000; // ms per bucket
  
  // Count snapshots in each time bucket
  engine.qubits.forEach(qubit => {
    if (!qubit.snapshotTimes || !Array.isArray(qubit.snapshotTimes)) return;
    
    qubit.snapshotTimes.forEach(time => {
      const age = now - time;
      if (age >= 0) {
        const bucketIndex = Math.min(maxSpheres - 1, Math.floor(age / bucketSize));
        if (bucketIndex >= 0 && bucketIndex < maxSpheres) {
          timeBuckets[bucketIndex]++;
        }
      }
    });
  });
  
  // Update memory spheres based on time buckets
  memorySpheres.forEach((sphere, i) => {
    const count = timeBuckets[i];
    
    if (count > 0) {
      sphere.visible = true;
      
      // Scale based on the number of snapshots in this bucket
      const scale = 0.5 + Math.min(2.5, count / (engine.qubits.length * 0.2));
      
      // Animate recall effect: Scale up the recalled sphere
      if ((i === recalledIndex || (recalledIndex < 0 && i < 3)) && recallFade > 0) {
        const recallScale = scale * (1 + recallFade * 1.5);
        sphere.scale.set(recallScale, recallScale, recallScale);
        sphere.material.opacity = 0.3 + recallFade * 0.5; // More opaque when recalled
        
        // Set color based on type of recall
        if (recalledIndex >= 0) {
          sphere.material.color.setHSL(0.5 + recallFade * 0.2, 1, 0.6); // Shift to green for global recall
        } else if (recalledIndex >= -3) {
          // Layer-based recall - different colors for different layers
          const layer = Math.abs(recalledIndex) - 1; 
          const layerColors = [0.6, 0.7, 0.3]; // Different hues for layers
          sphere.material.color.setHSL(layerColors[layer % 3], 1, 0.6);
        } else {
          // Individual recall
          sphere.material.color.setHSL(0.8, 1, 0.6); // Magenta
        }
      } else {
        // Reset scale and opacity for non-recalled or faded spheres
        sphere.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
        sphere.material.opacity = 0.2; // Base opacity
        sphere.material.color.set(0x00ffff); // Reset color
      }
      
      // Position spheres in a receding line scaled to viewport
      const memoryDepth = -150 * depthScale;
      const memorySpacing = 15 * depthScale;
      sphere.position.z = memoryDepth - i * memorySpacing;
      
    } else {
      sphere.visible = false;
    }
  });
}

// Update ambient particle system for background effects
export function updateAmbientParticles(time) {
  if (!ambientPointsMesh) return;

  const positions = ambientPointsMesh.geometry.attributes.position.array;
  const particleCount = positions.length / 3;
  const viewport = getViewportBounds ? getViewportBounds() : { width: window.innerWidth, height: window.innerHeight };
  
  // Keep ambient particles within a bounded region scaled to viewport
  const boundRadius = Math.min(viewport.width, viewport.height) * 0.8;
  const boundHeight = boundRadius * 0.7;

  for (let i = 0; i < particleCount; i++) {
    // Subtle vertical drift
    positions[i * 3 + 2] += Math.sin(time * 0.0001 + i * 0.1) * 0.1;

    // Keep particles within bounds
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    
    // Calculate distance from center in XY plane
    const distanceXY = Math.sqrt(x*x + y*y);
    
    // If outside bounds, gently nudge back
    if (distanceXY > boundRadius * 1.2) {
      // Move towards center
      const angle = Math.atan2(y, x);
      positions[i * 3] -= Math.cos(angle) * 0.5;
      positions[i * 3 + 1] -= Math.sin(angle) * 0.5;
    }
    
    // Keep height bounded
    if (z > boundHeight) positions[i * 3 + 2] = boundHeight;
    if (z < -boundHeight) positions[i * 3 + 2] = -boundHeight;
  }

  ambientPointsMesh.geometry.attributes.position.needsUpdate = true;
}