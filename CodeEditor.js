import { showSuccessAlert } from '../visualization/Effects.js';

// Update code health display
export function updateCodeHealthVisuals(health) {
  document.getElementById('code-health').textContent = `${Math.round(health * 100)}%`;
  document.getElementById('code-health-bar').style.width = `${health * 100}%`;
}

// Set up code editor functionality
export function setupCodeEditor(engine) {
  document.getElementById('toggle-code-editor').addEventListener('click', () => {
    const editor = document.getElementById('code-editor');
    if (editor.style.display === 'none' || editor.style.display === '') {
      editor.style.display = 'block';
    } else {
      editor.style.display = 'none';
    }
  });

  document.getElementById('generate-code').addEventListener('click', () => {
    const generatedCode = engine.generateCodeImprovement();
    document.getElementById('code-text').value = generatedCode;
    document.getElementById('code-status').textContent = 'New code generated. Press "Apply" to test.';
  });

  document.getElementById('apply-code').addEventListener('click', () => {
    const code = document.getElementById('code-text').value;
    const result = engine.applyCodeModification(code);
    
    if (result.success) {
      document.getElementById('code-status').textContent = 'Success! Improvements applied.';
      document.getElementById('evolution-count').textContent = engine.codeEvolutions;
      showSuccessAlert();
    } else if (result.error) {
      document.getElementById('code-status').textContent = `Error: ${result.error}`;
    } else {
      document.getElementById('code-status').textContent = 'Code did not improve performance. Try again.';
    }
  });
}