'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let currentBlob = null;
let cameraStream = null;
let activeTab = 'upload';

// ── DOM refs ───────────────────────────────────────────────────────────────
const previewVideo      = document.getElementById('preview');
const snapshotCanvas    = document.getElementById('snapshot');
const capturedImg       = document.getElementById('captured-preview');
const cameraPlaceholder = document.getElementById('camera-placeholder');

const uploadFrame   = document.getElementById('upload-frame');
const uploadPreview = document.getElementById('upload-preview');
const dropZone      = document.getElementById('drop-zone');
const fileInput     = document.getElementById('file-input');

const startCameraBtn  = document.getElementById('start-camera-btn');
const stopCameraBtn   = document.getElementById('stop-camera-btn');
const captureBtn      = document.getElementById('capture-btn');
const recaptureBtn    = document.getElementById('recapture-btn');
const cameraCropBtn   = document.getElementById('camera-crop-btn');
const clearUploadBtn  = document.getElementById('clear-upload-btn');
const uploadActions   = document.getElementById('upload-actions');
const uploadCropBtn   = document.getElementById('upload-crop-btn');
const submitBtn       = document.getElementById('submit-btn');

const cropView       = document.getElementById('crop-view');
const cropImg        = document.getElementById('crop-img');
const cropCanvas     = document.getElementById('crop-canvas');
const cropApplyBtn   = document.getElementById('crop-apply-btn');
const cropCancelBtn  = document.getElementById('crop-cancel-btn');

const copyBtn      = document.getElementById('copy-btn');
const downloadBtn  = document.getElementById('download-btn');
const outputEditor = document.getElementById('output-editor');
const statusEl     = document.getElementById('status');
const tabInk       = document.getElementById('tab-ink');

// ── Tab switching ──────────────────────────────────────────────────────────
const uploadView = document.getElementById('upload-view');
const cameraView = document.getElementById('camera-view');

function switchTab(tabName) {
  if (tabName === activeTab) return;
  if (activeTab === 'camera') stopCamera();
  activeTab = tabName;

  const isUpload = tabName === 'upload';
  uploadView.style.display = isUpload ? 'flex' : 'none';
  cameraView.style.display = isUpload ? 'none' : 'flex';

  document.querySelectorAll('.tab').forEach(t => {
    const active = t.dataset.tab === tabName;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active);
  });

  // slide the ink indicator (non-critical)
  const activeBtn = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (activeBtn && tabInk) {
    tabInk.style.left  = activeBtn.offsetLeft + 'px';
    tabInk.style.width = activeBtn.offsetWidth + 'px';
  }
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

stopCameraBtn.addEventListener('click', stopCamera);

// set initial ink position after layout
requestAnimationFrame(() => {
  const activeBtn = document.querySelector('.tab.active');
  if (activeBtn && tabInk) {
    tabInk.style.left  = activeBtn.offsetLeft + 'px';
    tabInk.style.width = activeBtn.offsetWidth + 'px';
  }
});

// ── Camera ─────────────────────────────────────────────────────────────────
startCameraBtn.addEventListener('click', async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 } },
    });
    previewVideo.srcObject = cameraStream;
    previewVideo.classList.add('active');
    cameraPlaceholder.hidden = true;
    capturedImg.hidden = true;
    startCameraBtn.hidden = true;
    stopCameraBtn.hidden = false;
    captureBtn.disabled = false;
    recaptureBtn.hidden = true;
  } catch (err) {
    setStatus(`Camera error: ${err.message}`, 'error');
  }
});

captureBtn.addEventListener('click', () => {
  const ctx = snapshotCanvas.getContext('2d');
  snapshotCanvas.width  = previewVideo.videoWidth;
  snapshotCanvas.height = previewVideo.videoHeight;
  ctx.drawImage(previewVideo, 0, 0);

  snapshotCanvas.toBlob(blob => {
    currentBlob = blob;
    capturedImg.src = URL.createObjectURL(blob);
    capturedImg.hidden = false;
    previewVideo.classList.remove('active');
    captureBtn.hidden = true;
    recaptureBtn.hidden = false;
    cameraCropBtn.hidden = false;
    submitBtn.disabled = false;
  }, 'image/jpeg', 0.92);
});

recaptureBtn.addEventListener('click', () => {
  currentBlob = null;
  capturedImg.hidden = true;
  previewVideo.classList.add('active');
  captureBtn.hidden = false;
  recaptureBtn.hidden = true;
  cameraCropBtn.hidden = true;
  submitBtn.disabled = true;
});

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  previewVideo.srcObject = null;
  previewVideo.classList.remove('active');
  startCameraBtn.hidden = false;
  stopCameraBtn.hidden = true;
  captureBtn.disabled = true;
  captureBtn.hidden = false;
  recaptureBtn.hidden = true;
  cameraCropBtn.hidden = true;
  capturedImg.hidden = true;
  cameraPlaceholder.hidden = false;
  currentBlob = null;
  submitBtn.disabled = true;
}

// ── File upload ────────────────────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadFile(file);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

function loadFile(file) {
  currentBlob = file;
  uploadPreview.src = URL.createObjectURL(file);
  dropZone.hidden = true;
  uploadFrame.hidden = false;
  uploadActions.hidden = false;
  submitBtn.disabled = false;
}

clearUploadBtn.addEventListener('click', clearUpload);

function clearUpload() {
  currentBlob = null;
  if (uploadPreview.src) URL.revokeObjectURL(uploadPreview.src);
  uploadPreview.src = '';
  uploadFrame.hidden = true;
  uploadActions.hidden = true;
  dropZone.hidden = false;
  submitBtn.disabled = true;
  fileInput.value = '';
}

// ── Paste ──────────────────────────────────────────────────────────────────
document.addEventListener('paste', e => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (!file) continue;
      switchTab('upload');
      loadFile(file);
      // flash the drop zone area to confirm paste
      uploadFrame.classList.add('paste-flashed');
      setTimeout(() => uploadFrame.classList.remove('paste-flashed'), 400);
      break;
    }
  }
});

// ── Submit ─────────────────────────────────────────────────────────────────
submitBtn.addEventListener('click', async () => {
  if (!currentBlob) return;

  const formData = new FormData();
  formData.append('file', currentBlob, 'image.jpg');

  submitBtn.disabled = true;
  submitBtn.classList.add('processing');
  setStatus('processing… (first run loads the model ~30s)', 'loading');
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
  outputEditor.value = '';

  try {
    const res  = await fetch('/api/ocr', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Server error');

    outputEditor.value = data.markdown;
    setStatus('');
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
  } catch (err) {
    setStatus(`error: ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('processing');
  }
});

// ── Copy & download ────────────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(outputEditor.value).then(() => {
    const orig = copyBtn.innerHTML;
    copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied';
    setTimeout(() => { copyBtn.innerHTML = orig; }, 1500);
  });
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([outputEditor.value], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'output.md';
  a.click();
  URL.revokeObjectURL(a.href);
});

// ── Crop ──────────────────────────────────────────────────────────────────
const HANDLE_R = 6;
const CURSORS  = { nw:'nw-resize', n:'n-resize', ne:'ne-resize', e:'e-resize',
                   se:'se-resize', s:'s-resize', sw:'sw-resize', w:'w-resize' };
let cropSourceTab = null;
let cropRect      = null;
let cropDrag      = null;

function enterCrop(sourceTab) {
  cropSourceTab = sourceTab;
  const url = URL.createObjectURL(currentBlob);

  cropImg.onload = () => requestAnimationFrame(() => {
    cropCanvas.width  = cropImg.offsetWidth;
    cropCanvas.height = cropImg.offsetHeight;
    const p = 10;
    cropRect = { x: p, y: p, w: cropCanvas.width - p * 2, h: cropCanvas.height - p * 2 };
    drawCrop();
  });
  cropImg.src = url;

  uploadView.style.display = 'none';
  cameraView.style.display = 'none';
  cropView.style.display   = 'flex';
}

function exitCrop() {
  cropView.style.display = 'none';
  if (cropSourceTab === 'upload') uploadView.style.display = 'flex';
  else                            cameraView.style.display = 'flex';
  URL.revokeObjectURL(cropImg.src);
  cropImg.src = '';
  cropSourceTab = null;
  cropRect = null;
  cropDrag = null;
}

uploadCropBtn.addEventListener('click',  () => enterCrop('upload'));
cameraCropBtn.addEventListener('click',  () => enterCrop('camera'));
cropCancelBtn.addEventListener('click',  exitCrop);

cropApplyBtn.addEventListener('click', () => {
  const scaleX = cropImg.naturalWidth  / cropCanvas.width;
  const scaleY = cropImg.naturalHeight / cropCanvas.height;
  const cx = Math.max(0, Math.round(cropRect.x * scaleX));
  const cy = Math.max(0, Math.round(cropRect.y * scaleY));
  const cw = Math.min(cropImg.naturalWidth  - cx, Math.round(cropRect.w * scaleX));
  const ch = Math.min(cropImg.naturalHeight - cy, Math.round(cropRect.h * scaleY));

  const off = document.createElement('canvas');
  off.width  = cw;
  off.height = ch;
  off.getContext('2d').drawImage(cropImg, cx, cy, cw, ch, 0, 0, cw, ch);

  off.toBlob(blob => {
    currentBlob = blob;
    const newUrl = URL.createObjectURL(blob);
    if (cropSourceTab === 'upload') {
      URL.revokeObjectURL(uploadPreview.src);
      uploadPreview.src = newUrl;
    } else {
      URL.revokeObjectURL(capturedImg.src);
      capturedImg.src = newUrl;
    }
    exitCrop();
    submitBtn.disabled = false;
  }, 'image/jpeg', 0.92);
});

// drawing
function handlePositions() {
  const { x, y, w, h } = cropRect;
  return [
    { id:'nw', x,        y        }, { id:'n', x:x+w/2,  y        },
    { id:'ne', x:x+w,    y        }, { id:'e', x:x+w,    y:y+h/2  },
    { id:'se', x:x+w,    y:y+h   }, { id:'s', x:x+w/2,  y:y+h    },
    { id:'sw', x,        y:y+h   }, { id:'w', x,         y:y+h/2  },
  ];
}

function drawCrop() {
  const ctx = cropCanvas.getContext('2d');
  const W = cropCanvas.width, H = cropCanvas.height;
  const { x, y, w, h } = cropRect;
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.fillRect(0, 0, W, H);
  ctx.clearRect(x, y, w, h);

  ctx.strokeStyle = 'rgba(196,156,85,0.95)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  for (let i = 1; i < 3; i++) {
    ctx.moveTo(x + w*i/3, y); ctx.lineTo(x + w*i/3, y+h);
    ctx.moveTo(x, y + h*i/3); ctx.lineTo(x+w, y + h*i/3);
  }
  ctx.stroke();

  for (const hp of handlePositions()) {
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, HANDLE_R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(196,156,85,0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// interaction
function cropCanvasPos(e) {
  const r = cropCanvas.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - r.left)  * (cropCanvas.width  / r.width),
    y: (src.clientY - r.top)   * (cropCanvas.height / r.height),
  };
}

function hitHandle(px, py) {
  for (const hp of handlePositions())
    if (Math.hypot(px - hp.x, py - hp.y) <= HANDLE_R + 5) return hp.id;
  return null;
}

function inSelection(px, py) {
  return px > cropRect.x && px < cropRect.x + cropRect.w &&
         py > cropRect.y && py < cropRect.y + cropRect.h;
}

function onCropDown(e) {
  e.preventDefault();
  const p = cropCanvasPos(e);
  const handle = hitHandle(p.x, p.y);
  if (handle) {
    cropDrag = { type:'handle', handle, startX:p.x, startY:p.y, orig:{ ...cropRect } };
  } else if (inSelection(p.x, p.y)) {
    cropDrag = { type:'move', startX:p.x, startY:p.y, orig:{ ...cropRect } };
  } else {
    cropDrag = { type:'new', startX:p.x, startY:p.y,
                 touchOriginY: e.touches ? e.touches[0].clientY : null };
    cropRect = { x:p.x, y:p.y, w:0, h:0 };
  }
}

function onCropMove(e) {
  e.preventDefault();
  const p = cropCanvasPos(e);

  if (!cropDrag) {
    const h = hitHandle(p.x, p.y);
    cropCanvas.style.cursor = h ? CURSORS[h] : inSelection(p.x, p.y) ? 'move' : 'crosshair';
    return;
  }

  // Resolve scroll-vs-draw intent on the first significant touch movement
  if (cropDrag.type === 'new' && cropDrag.touchOriginY !== null && e.touches) {
    const clientDY = Math.abs(e.touches[0].clientY - cropDrag.touchOriginY);
    const canvasDX = Math.abs(p.x - cropDrag.startX);
    if (clientDY > 8 || canvasDX > 8) {
      if (clientDY > canvasDX) {
        cropDrag = { type: 'scroll', lastY: e.touches[0].clientY };
      } else {
        cropDrag = { ...cropDrag, touchOriginY: null };
      }
    }
  }

  if (cropDrag.type === 'scroll' && e.touches) {
    const y = e.touches[0].clientY;
    cropCanvas.closest('.crop-container').scrollTop += cropDrag.lastY - y;
    cropDrag = { type: 'scroll', lastY: y };
    return;
  }

  const dx = p.x - cropDrag.startX;
  const dy = p.y - cropDrag.startY;
  const W = cropCanvas.width, H = cropCanvas.height;
  const MIN = 20;

  if (cropDrag.type === 'new') {
    cropRect = {
      x: Math.min(cropDrag.startX, p.x), y: Math.min(cropDrag.startY, p.y),
      w: Math.abs(dx), h: Math.abs(dy),
    };
  } else if (cropDrag.type === 'move') {
    const o = cropDrag.orig;
    cropRect = { ...o,
      x: Math.max(0, Math.min(W - o.w, o.x + dx)),
      y: Math.max(0, Math.min(H - o.h, o.y + dy)),
    };
  } else {
    let { x, y, w, h } = cropDrag.orig;
    switch (cropDrag.handle) {
      case 'nw': x+=dx; y+=dy; w-=dx; h-=dy; break;
      case 'n':         y+=dy;         h-=dy; break;
      case 'ne':        y+=dy; w+=dx; h-=dy; break;
      case 'e':                 w+=dx;        break;
      case 'se':                w+=dx; h+=dy; break;
      case 's':                         h+=dy; break;
      case 'sw': x+=dx;        w-=dx; h+=dy; break;
      case 'w':  x+=dx;        w-=dx;        break;
    }
    if (w < MIN) { if ('nw sw w'.includes(cropDrag.handle)) x = cropDrag.orig.x + cropDrag.orig.w - MIN; w = MIN; }
    if (h < MIN) { if ('nw ne n'.includes(cropDrag.handle)) y = cropDrag.orig.y + cropDrag.orig.h - MIN; h = MIN; }
    x = Math.max(0, x); y = Math.max(0, y);
    if (x + w > W) w = W - x;
    if (y + h > H) h = H - y;
    cropRect = { x, y, w, h };
  }
  drawCrop();
}

function onCropUp(e) { if (e) e.preventDefault(); cropDrag = null; }

cropCanvas.addEventListener('mousedown',  onCropDown);
cropCanvas.addEventListener('mousemove',  onCropMove);
cropCanvas.addEventListener('mouseup',    onCropUp);
cropCanvas.addEventListener('mouseleave', onCropUp);
cropCanvas.addEventListener('touchstart', onCropDown, { passive: false });
cropCanvas.addEventListener('touchmove',  onCropMove, { passive: false });
cropCanvas.addEventListener('touchend',   onCropUp,   { passive: false });

// ── Helpers ────────────────────────────────────────────────────────────────
function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (type ? ` ${type}` : '');
}
