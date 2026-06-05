/* ============================================================
   Fashion MNIST CNN Classifier — Dashboard Application
   ============================================================
   Dependencies: Chart.js (loaded via CDN in HTML)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ── Class Names Constant ──────────────────────────────────
  const CLASS_NAMES = [
    'T-shirt/top', 'Trouser', 'Pullover', 'Dress', 'Coat',
    'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot'
  ];

  // ── Global State ──────────────────────────────────────────
  let probChart = null;
  let currentInputType = 'none'; // 'none' | 'canvas' | 'upload' | 'sample'
  const placeholderImg =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  // Set processed-preview placeholder on load
  const processedPreview = document.getElementById('processed-preview');
  if (processedPreview) processedPreview.src = placeholderImg;

  // ============================================================
  // 1. Drawing Canvas Logic
  // ============================================================
  const paintCanvas = document.getElementById('paint-canvas');
  const ctx = paintCanvas ? paintCanvas.getContext('2d') : null;
  const brushSlider = document.getElementById('brush-slider');
  const brushVal = document.getElementById('brush-val');
  const clearBtn = document.getElementById('clear-btn');
  const predictCanvasBtn = document.getElementById('predict-canvas-btn');

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  function initCanvas() {
    if (!ctx) return;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = brushSlider ? parseInt(brushSlider.value, 10) : 15;
  }

  initCanvas();

  if (brushSlider) {
    brushSlider.addEventListener('input', () => {
      if (brushVal) brushVal.textContent = brushSlider.value;
      if (ctx) ctx.lineWidth = parseInt(brushSlider.value, 10);
    });
  }

  function getMousePos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getMousePos(paintCanvas, e);
    lastX = pos.x;
    lastY = pos.y;

    // Draw a dot at the starting point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getMousePos(paintCanvas, e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastX = pos.x;
    lastY = pos.y;
  }

  function stopDrawing() {
    isDrawing = false;
  }

  if (paintCanvas) {
    // Mouse events
    paintCanvas.addEventListener('mousedown', startDrawing);
    paintCanvas.addEventListener('mousemove', draw);
    paintCanvas.addEventListener('mouseup', stopDrawing);
    paintCanvas.addEventListener('mouseout', stopDrawing);

    // Touch events
    paintCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    paintCanvas.addEventListener('touchmove', draw, { passive: false });
    paintCanvas.addEventListener('touchend', stopDrawing);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      initCanvas();
      resetPredictionUI();
    });
  }

  // ============================================================
  // 2. File Upload / Drag & Drop
  // ============================================================
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('preview-container');
  const uploadPreview = document.getElementById('upload-preview');
  const removeUploadBtn = document.getElementById('remove-upload-btn');
  const predictUploadBtn = document.getElementById('predict-upload-btn');

  let uploadedImageBase64 = null;

  // Prevent defaults on all drag events
  if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Visual feedback on drag
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragover');
      });
    });

    // Handle drop
    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      handleFiles(files);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      handleFiles(fileInput.files);
    });
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImageBase64 = e.target.result;

      // Show preview, hide drop zone
      if (uploadPreview) uploadPreview.src = uploadedImageBase64;
      if (dropZone) dropZone.classList.add('hidden');
      if (previewContainer) previewContainer.classList.remove('hidden');

      // Reset canvas and sample selections
      initCanvas();
      clearSampleSelections();
      currentInputType = 'upload';
    };
    reader.readAsDataURL(file);
  }

  if (removeUploadBtn) {
    removeUploadBtn.addEventListener('click', () => {
      resetUploadUI();
      resetPredictionUI();
    });
  }

  function resetUploadUI() {
    uploadedImageBase64 = null;
    if (uploadPreview) uploadPreview.src = '';
    if (dropZone) dropZone.classList.remove('hidden');
    if (previewContainer) previewContainer.classList.add('hidden');
    if (fileInput) fileInput.value = '';
  }

  // ============================================================
  // 3. Test Dataset Sampler
  // ============================================================
  const samplesContainer = document.getElementById('samples-container');

  async function loadTestSamples() {
    if (!samplesContainer) return;

    try {
      const response = await fetch('/static/test_samples.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const samples = await response.json();

      samplesContainer.innerHTML = '';

      samples.forEach((sample) => {
        const item = document.createElement('div');
        item.className = 'sample-item';
        item.dataset.id = sample.id;
        item.dataset.label = sample.label;
        item.title = `${CLASS_NAMES[sample.label] || 'Unknown'} (Label: ${sample.label})`;

        const img = document.createElement('img');
        img.src = sample.image;
        img.alt = CLASS_NAMES[sample.label] || 'Sample';
        img.draggable = false;

        item.appendChild(img);

        item.addEventListener('click', () => {
          // Reset other inputs
          initCanvas();
          resetUploadUI();

          // Highlight selected
          clearSampleSelections();
          item.classList.add('selected');

          currentInputType = 'sample';
          predictImage(
            sample.image,
            'Dataset Sample',
            sample.label
          );
        });

        samplesContainer.appendChild(item);
      });
    } catch (err) {
      console.error('Failed to load test samples:', err);
      if (samplesContainer) {
        samplesContainer.innerHTML =
          '<p class="error-message">⚠ Failed to load test samples. Please refresh the page.</p>';
      }
    }
  }

  function clearSampleSelections() {
    document.querySelectorAll('.sample-item').forEach((el) => {
      el.classList.remove('selected');
    });
  }

  // ============================================================
  // 4. Prediction API
  // ============================================================
  if (predictCanvasBtn) {
    predictCanvasBtn.addEventListener('click', () => {
      currentInputType = 'canvas';
      clearSampleSelections();
      const base64 = paintCanvas.toDataURL('image/png');
      predictImage(base64, 'Canvas Drawing');
    });
  }

  if (predictUploadBtn) {
    predictUploadBtn.addEventListener('click', () => {
      if (!uploadedImageBase64) return;
      currentInputType = 'upload';
      clearSampleSelections();
      predictImage(uploadedImageBase64, 'Uploaded Image');
    });
  }

  async function predictImage(base64Data, sourceName, actualLabel = null) {
    const loadingOverlay = document.getElementById('prediction-loading');
    const predictedClassEl = document.getElementById('predicted-class');
    const predictedConfidenceEl = document.getElementById('predicted-confidence');
    const sourceBadgeEl = document.getElementById('source-badge');
    const actualLabelEl = document.getElementById('actual-label');
    const startTime = Date.now();

    try {
      // Show loading
      if (loadingOverlay) loadingOverlay.classList.add('active');
      if (predictedClassEl) predictedClassEl.textContent = 'Analyzing...';
      if (predictedConfidenceEl) predictedConfidenceEl.textContent = '...';

      // Update processed preview
      if (processedPreview) processedPreview.src = base64Data;

      // Update source badge
      if (sourceBadgeEl) {
        sourceBadgeEl.textContent = sourceName;
        sourceBadgeEl.className = 'badge success';
      }

      // POST to prediction endpoint
      const response = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data })
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const result = await response.json();

      // Update prediction results
      if (predictedClassEl) predictedClassEl.textContent = result.top_class;
      if (predictedConfidenceEl) {
        const pct = (result.top_probability * 100).toFixed(1);
        predictedConfidenceEl.textContent = `${pct}%`;
      }

      // Update actual label if provided
      const actualContainer = document.getElementById('actual-label-container');
      if (actualLabel !== null && actualLabel !== undefined) {
        // actualLabel may be a string ("Trouser") or a numeric index
        const labelText = typeof actualLabel === 'number' ? (CLASS_NAMES[actualLabel] || `Class ${actualLabel}`) : actualLabel;
        if (actualLabelEl) actualLabelEl.textContent = labelText;
        if (actualContainer) actualContainer.classList.remove('hidden');
      } else {
        if (actualContainer) actualContainer.classList.add('hidden');
      }

      // Update chart
      updateChart(result.predictions);
    } catch (err) {
      console.error('Prediction failed:', err);
      alert('Prediction failed. Please check the server and try again.');
      resetPredictionUI();
    } finally {
      // Ensure loading overlay shows for at least 300ms for smooth animation
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 300 - elapsed);
      setTimeout(() => {
        if (loadingOverlay) loadingOverlay.classList.remove('active');
      }, remaining);
    }
  }

  function resetPredictionUI() {
    const predictedClassEl = document.getElementById('predicted-class');
    const predictedConfidenceEl = document.getElementById('predicted-confidence');
    const sourceBadgeEl = document.getElementById('source-badge');
    const actualLabelEl = document.getElementById('actual-label');

    if (predictedClassEl) predictedClassEl.textContent = '—';
    if (predictedConfidenceEl) predictedConfidenceEl.textContent = '0.0%';
    if (processedPreview) processedPreview.src = placeholderImg;
    const actualContainer2 = document.getElementById('actual-label-container');
    if (actualContainer2) actualContainer2.classList.add('hidden');
    if (sourceBadgeEl) {
      sourceBadgeEl.textContent = 'No Input';
      sourceBadgeEl.className = 'badge';
    }

    // Reset chart to zeros
    if (probChart) {
      probChart.data.datasets[0].data = new Array(CLASS_NAMES.length).fill(0);
      probChart.update();
    }
  }

  // ============================================================
  // 5. Probability Bar Chart (Chart.js)
  // ============================================================
  const chartColors = [
    'rgba(34, 211, 238, 0.6)',   // cyan
    'rgba(96, 165, 250, 0.6)',   // blue
    'rgba(167, 139, 250, 0.6)',  // purple
    'rgba(129, 140, 248, 0.6)',  // indigo
    'rgba(52, 211, 153, 0.6)',   // green
    'rgba(20, 184, 166, 0.6)',   // teal
    'rgba(34, 211, 238, 0.6)',   // cyan
    'rgba(96, 165, 250, 0.6)',   // blue
    'rgba(167, 139, 250, 0.6)',  // purple
    'rgba(129, 140, 248, 0.6)'   // indigo
  ];

  const chartBorderColors = [
    'rgba(34, 211, 238, 1)',
    'rgba(96, 165, 250, 1)',
    'rgba(167, 139, 250, 1)',
    'rgba(129, 140, 248, 1)',
    'rgba(52, 211, 153, 1)',
    'rgba(20, 184, 166, 1)',
    'rgba(34, 211, 238, 1)',
    'rgba(96, 165, 250, 1)',
    'rgba(167, 139, 250, 1)',
    'rgba(129, 140, 248, 1)'
  ];

  function initProbabilityChart() {
    const canvas = document.getElementById('probabilities-chart');
    if (!canvas) return;
    const chartCtx = canvas.getContext('2d');

    probChart = new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels: CLASS_NAMES,
        datasets: [{
          label: 'Confidence',
          data: new Array(CLASS_NAMES.length).fill(0),
          backgroundColor: chartColors,
          borderColor: chartBorderColors,
          borderWidth: 1.5,
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#111827',
            titleColor: '#f0f6fc',
            bodyColor: '#8b949e',
            borderColor: 'rgba(255, 255, 255, 0.06)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const value = context.parsed.x;
                return ` ${(value * 100).toFixed(1)}%`;
              }
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 1,
            ticks: {
              color: '#484f58',
              callback: (value) => `${(value * 100).toFixed(0)}%`
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.02)'
            }
          },
          y: {
            ticks: {
              color: '#f0f6fc',
              font: {
                family: 'Outfit',
                weight: '500'
              }
            },
            grid: {
              display: false
            }
          }
        },
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  function updateChart(predictions) {
    if (!probChart) return;

    // Map predictions object/array to CLASS_NAMES order
    const data = CLASS_NAMES.map((name) => {
      if (Array.isArray(predictions)) {
        // If predictions is an array of {class, probability} objects
        const match = predictions.find(
          (p) => p.class === name || p.class_name === name || p.label === name
        );
        return match ? (match.probability ?? match.confidence ?? 0) : 0;
      }
      // If predictions is a plain object { "T-shirt/top": 0.95, ... }
      return predictions[name] ?? 0;
    });

    probChart.data.datasets[0].data = data;
    probChart.update();
  }

  // ============================================================
  // 6. Training History Charts
  // ============================================================
  async function loadTrainingHistoryCharts() {
    try {
      const response = await fetch('/static/training_history.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const history = await response.json();

      const numEpochs = (history.accuracy || history.acc || []).length;
      const epochs = Array.from({ length: numEpochs }, (_, i) => i + 1);

      const trainAcc = history.accuracy || history.acc || [];
      const valAcc = history.val_accuracy || history.val_acc || [];
      const trainLoss = history.loss || [];
      const valLoss = history.val_loss || [];

      // ── Shared chart config builder ───────────────────────
      const sharedScales = (yTitle) => ({
        x: {
          title: {
            display: true,
            text: 'Epoch',
            color: '#484f58'
          },
          ticks: { color: '#484f58' },
          grid: { color: 'rgba(255, 255, 255, 0.02)' }
        },
        y: {
          title: {
            display: !!yTitle,
            text: yTitle || '',
            color: '#484f58'
          },
          ticks: { color: '#484f58' },
          grid: { color: 'rgba(255, 255, 255, 0.02)' }
        }
      });

      const sharedOptions = (yTitle) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#8b949e',
              font: {
                family: 'Inter',
                size: 11
              }
            }
          }
        },
        scales: sharedScales(yTitle)
      });

      // ── Accuracy Chart ────────────────────────────────────
      const accCanvas = document.getElementById('accuracy-history-chart');
      if (accCanvas) {
        new Chart(accCanvas.getContext('2d'), {
          type: 'line',
          data: {
            labels: epochs,
            datasets: [
              {
                label: 'Train Accuracy',
                data: trainAcc,
                borderColor: '#22d3ee',
                backgroundColor: 'rgba(34, 211, 238, 0.04)',
                fill: true,
                tension: 0.4,
                borderWidth: 2.5,
                pointRadius: 3,
                pointBackgroundColor: '#22d3ee'
              },
              {
                label: 'Validation Accuracy',
                data: valAcc,
                borderColor: '#a78bfa',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.4,
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 3,
                pointBackgroundColor: '#a78bfa'
              }
            ]
          },
          options: sharedOptions('Accuracy')
        });
      }

      // ── Loss Chart ────────────────────────────────────────
      const lossCanvas = document.getElementById('loss-history-chart');
      if (lossCanvas) {
        new Chart(lossCanvas.getContext('2d'), {
          type: 'line',
          data: {
            labels: epochs,
            datasets: [
              {
                label: 'Train Loss',
                data: trainLoss,
                borderColor: '#60a5fa',
                backgroundColor: 'rgba(96, 165, 250, 0.04)',
                fill: true,
                tension: 0.4,
                borderWidth: 2.5,
                pointRadius: 3,
                pointBackgroundColor: '#60a5fa'
              },
              {
                label: 'Validation Loss',
                data: valLoss,
                borderColor: '#818cf8',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.4,
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 3,
                pointBackgroundColor: '#818cf8'
              }
            ]
          },
          options: sharedOptions('Loss')
        });
      }
    } catch (err) {
      console.error('Failed to load training history:', err);
      document.querySelectorAll('.metrics-chart-wrapper').forEach((wrapper) => {
        wrapper.innerHTML =
          '<p class="error-message">⚠ Training history unavailable.</p>';
      });
    }
  }

  // ============================================================
  // 7. Scroll Animations (IntersectionObserver)
  // ============================================================
  function setupScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el);
    });
  }

  // ============================================================
  // 8. Mobile Navigation Toggle
  // ============================================================
  function setupMobileNav() {
    const mobileToggle = document.querySelector('.mobile-toggle');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) navLinks.classList.toggle('open');
      });
    }
  }

  // ============================================================
  // 9. Smooth Scroll for Nav Links
  // ============================================================
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const targetSection = document.querySelector(targetId);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }

        // Close mobile nav if open
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) navLinks.classList.remove('open');
      });
    });

    // Update active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('a[href^="#"]');

    if (sections.length && navAnchors.length) {
      window.addEventListener('scroll', () => {
        let currentSection = '';
        const scrollY = window.scrollY;

        sections.forEach((section) => {
          const sectionTop = section.offsetTop - 120;
          if (scrollY >= sectionTop) {
            currentSection = section.getAttribute('id');
          }
        });

        navAnchors.forEach((anchor) => {
          anchor.classList.remove('active');
          if (anchor.getAttribute('href') === `#${currentSection}`) {
            anchor.classList.add('active');
          }
        });
      }, { passive: true });
    }
  }

  // ============================================================
  // 10. Initialization
  // ============================================================
  initProbabilityChart();
  loadTestSamples();
  loadTrainingHistoryCharts();
  setupScrollAnimations();
  setupMobileNav();
  setupSmoothScroll();
});
