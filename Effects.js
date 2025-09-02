import * as THREE from 'three';

// Create particle animation for memory stream that stays in bounds
export function createMemoryStreamParticle(engine) {
  const memStream = document.getElementById('memory-stream');
  if (!memStream) return;

  const streamWidth = memStream.clientWidth;
  const streamHeight = memStream.clientHeight;

  const particle = document.createElement('div');
  particle.className = 'stream-particle';

  // Position at bottom of stream, ensure it's within bounds
  particle.style.left = `${Math.max(0, Math.min(streamWidth - 10, Math.random() * (streamWidth - 10)))}px`; 
  particle.style.bottom = '0px';

  // Random colors based on current quantum state and memory
  if (engine && engine.qubits && Array.isArray(engine.qubits) && engine.qubits.length > 0) {
    // Select random qubit that has memory snapshots
    const qubitsWithMemory = engine.qubits.filter(q => q.memorySnapshots && q.memorySnapshots.length > 0);
    
    if (qubitsWithMemory.length > 0) {
      const qubit = qubitsWithMemory[Math.floor(Math.random() * qubitsWithMemory.length)];
      // Get a random snapshot from this qubit
      const snapIndex = Math.floor(Math.random() * qubit.memorySnapshots.length);
      const snapshot = qubit.memorySnapshots[snapIndex];
      
      if (snapshot) {
        const hue = (snapshot.phase / (2 * Math.PI)) * 360;
        const saturation = 80 + 20 * Math.abs(snapshot.alpha - snapshot.beta);
        const lightness = 50 + 20 * snapshot.energy;

        particle.style.boxShadow = `0 0 5px 2px hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`;
      } else {
        particle.style.boxShadow = `0 0 5px 2px hsla(270, 70%, 60%, 0.7)`;
      }
    } else {
      // Fallback if no qubits have memory yet
      const idx = Math.floor(Math.random() * engine.qubits.length);
      const qubit = engine.qubits[idx];

      if (qubit && typeof qubit.phase === 'number' && typeof qubit.alpha === 'number' && typeof qubit.beta === 'number' && typeof qubit.energy === 'number') {
          const hue = (qubit.phase / (2 * Math.PI)) * 360;
          const saturation = 80 + 20 * Math.abs(qubit.alpha - qubit.beta);
          const lightness = 50 + 20 * qubit.energy;

          particle.style.boxShadow = `0 0 5px 2px hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`;
      } else {
          console.warn(`Invalid qubit properties at index ${idx}`);
          particle.style.boxShadow = `0 0 5px 2px hsla(200, 70%, 60%, 0.7)`;
      }
    }
  } else {
     particle.style.boxShadow = `0 0 5px 2px hsla(180, 80%, 50%, 0.7)`;
  }

  memStream.appendChild(particle);

  let pos = 0;
  const moveParticle = () => {
    pos += 2; 
    particle.style.bottom = `${pos}px`;

    if (particle.parentNode === memStream && pos < streamHeight - 10) {
      requestAnimationFrame(moveParticle);
    } else if (particle.parentNode === memStream) {
      try {
          memStream.removeChild(particle);
      } catch (e) {
      }
    }
  };

  requestAnimationFrame(moveParticle);
}

// Create ripple animation for memory recall that adjusts to viewport
export function createMemoryRecallRipple() {
  const ripple = document.createElement('div');
  ripple.className = 'memory-ripple';

  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;

  const rippleSize = Math.min(500, Math.min(viewWidth, viewHeight) * 0.8);

  ripple.style.left = `${viewWidth / 2}px`;
  ripple.style.top = `${viewHeight / 2}px`;
  ripple.style.transform = 'translate(-50%, -50%)';

  ripple.style.setProperty('--ripple-max-size', `${rippleSize}px`);

  document.body.appendChild(ripple);

  setTimeout(() => {
    if (ripple.parentNode === document.body) {
      try {
        document.body.removeChild(ripple);
      } catch (e) {
      }
    }
  }, 1800); 
}

// Show success alert when code evolution succeeds, responsive to viewport
export function showSuccessAlert() {
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;

  const alert = document.createElement('div');
  alert.className = 'success-alert';
  alert.textContent = 'Code Evolution Successful!';

  const fontSize = Math.max(14, Math.min(20, viewWidth / 50));
  alert.style.fontSize = `${fontSize}px`;
  alert.style.padding = `${Math.max(10, viewHeight / 40)}px ${Math.max(15, viewWidth / 40)}px`;

  document.body.appendChild(alert);

  setTimeout(() => {
    if (alert.parentNode === document.body) {
      document.body.removeChild(alert);
    }
  }, 3000);
}

// Create visual pulse animation for quantum gate application
export function createGatePulse(x, y, gateType) {
  if (isNaN(x) || isNaN(y) || x < -50 || x > window.innerWidth + 50 || y < -50 || y > window.innerHeight + 50) {
      return;
  }

  const pulse = document.createElement('div');
  pulse.className = 'gate-pulse';

  if (gateType === 'H') {
    pulse.classList.add('gate-h');
  } else if (gateType === 'X') {
    pulse.classList.add('gate-x');
  } else {
    pulse.classList.add('gate-h');
  }

  pulse.style.left = `${x}px`;
  pulse.style.top = `${y}px`;

  const pulseScale = Math.min(1.2, Math.max(0.5, window.innerWidth / 1200)); 
  pulse.style.setProperty('--pulse-scale', pulseScale.toFixed(2));

  document.body.appendChild(pulse);

  setTimeout(() => {
    if (pulse.parentNode === document.body) {
       try {
           document.body.removeChild(pulse);
       } catch (e) {
       }
    }
  }, 600); 
}

// FPS Counter
let frameCount = 0;
let lastFpsUpdateTime = 0;

export function updateFpsCounter(time) {
  frameCount++;

  if (time - lastFpsUpdateTime > 1000) { 
    const fps = Math.round(frameCount * 1000 / (time - lastFpsUpdateTime));

    const fpsCounter = document.getElementById('fps-counter');
    if (fpsCounter) {
      fpsCounter.textContent = fps;

      if (fps < 30) {
        fpsCounter.style.color = '#ff5555';
      } else if (fps < 45) {
        fpsCounter.style.color = '#ffaa55';
      } else {
        fpsCounter.style.color = '#88ff88';
      }
    }

    frameCount = 0;
    lastFpsUpdateTime = time;
  }
}