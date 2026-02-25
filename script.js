const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const spinBtn = document.getElementById('spinBtn');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');
const nameList = document.getElementById('nameList');
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');

let names = [];
let rotation = 0;
let spinning = false;

const TAU = Math.PI * 2;
const radius = canvas.width / 2;

const palette = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'
];

function normalizeName(value) {
  return String(value ?? '').trim();
}

function updateNameList() {
  nameList.innerHTML = '';
  names.forEach((name) => {
    const li = document.createElement('li');
    li.textContent = name;
    nameList.appendChild(li);
  });
}

function drawEmptyWheel() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(radius, radius, radius - 2, 0, TAU);
  ctx.fillStyle = '#f1f5f9';
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Upload names', radius, radius);
}

function drawWheel() {
  if (!names.length) {
    drawEmptyWheel();
    return;
  }

  const arc = TAU / names.length;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  names.forEach((name, i) => {
    const start = rotation + i * arc;
    const end = start + arc;

    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius - 2, start, end);
    ctx.closePath();
    ctx.fillStyle = palette[i % palette.length];
    ctx.fill();

    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(name, radius - 18, 0);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(radius, radius, 30, 0, TAU);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
}

function getSelectedIndex() {
  if (!names.length) return -1;
  const arc = TAU / names.length;
  const pointerAngle = -Math.PI / 2;
  const relative = ((pointerAngle - rotation) % TAU + TAU) % TAU;
  return Math.floor(relative / arc) % names.length;
}

function finishSpin() {
  const winnerIndex = getSelectedIndex();
  const winner = winnerIndex >= 0 ? names[winnerIndex] : 'No name';
  statusEl.textContent = `Winner: ${winner}`;
  spinBtn.disabled = false;
  spinning = false;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function spinWheel() {
  if (spinning || names.length < 2) {
    return;
  }

  spinning = true;
  spinBtn.disabled = true;
  statusEl.textContent = 'Spinning...';

  const start = performance.now();
  const duration = 4500;
  const startRotation = rotation;
  const extraTurns = (6 + Math.random() * 4) * TAU;
  const randomOffset = Math.random() * TAU;
  const targetRotation = startRotation + extraTurns + randomOffset;

  function animate(timestamp) {
    const elapsed = timestamp - start;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(t);
    rotation = startRotation + (targetRotation - startRotation) * eased;
    drawWheel();

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      rotation %= TAU;
      drawWheel();
      finishSpin();
    }
  }

  requestAnimationFrame(animate);
}

function setNamesFromRaw(rawValues) {
  const uniqueNames = [...new Set(rawValues.map(normalizeName).filter(Boolean))];

  if (!uniqueNames.length) {
    statusEl.textContent = 'No names found in that file.';
    spinBtn.disabled = true;
    clearBtn.disabled = true;
    names = [];
    drawWheel();
    updateNameList();
    return;
  }

  names = uniqueNames;
  rotation = 0;
  drawWheel();
  updateNameList();

  statusEl.textContent = `Loaded ${names.length} name${names.length === 1 ? '' : 's'}.`;
  spinBtn.disabled = names.length < 2;
  clearBtn.disabled = false;
}

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(','));
}

function parseExcelArrayBuffer(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
  return rows.flat();
}

function handleFile(file) {
  if (!file) return;

  const isCsv = file.name.toLowerCase().endsWith('.csv');

  if (isCsv) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result ?? '';
      setNamesFromRaw(parseCsv(String(text)));
    };
    reader.readAsText(file);
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const arrayBuffer = event.target?.result;
      setNamesFromRaw(parseExcelArrayBuffer(arrayBuffer));
    } catch {
      statusEl.textContent = 'Could not parse file. Check file format and try again.';
    }
  };
  reader.readAsArrayBuffer(file);
}

browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  handleFile(file);
});

spinBtn.addEventListener('click', spinWheel);

clearBtn.addEventListener('click', () => {
  names = [];
  rotation = 0;
  spinning = false;
  fileInput.value = '';
  statusEl.textContent = 'Upload a file to begin.';
  spinBtn.disabled = true;
  clearBtn.disabled = true;
  updateNameList();
  drawWheel();
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('drag-over');
  });
});

dropZone.addEventListener('drop', (event) => {
  const file = event.dataTransfer?.files?.[0];
  handleFile(file);
});

drawWheel();
