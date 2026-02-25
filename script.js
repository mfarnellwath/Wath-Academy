let names = [];
let nodes = [];
let sparkTimer = null;

const palette = [
  "#d9fff6",
  "#ffd9f5",
  "#ffe7bf",
  "#c7f5ff",
  "#e4ddff",
  "#d6ffd9",
  "#ffd6d6",
];

const spinButton = document.getElementById("spinButton");
const chooseFileButton = document.getElementById("chooseFileButton");
const fileInput = document.getElementById("fileInput");
const countdownText = document.getElementById("countdown");
const winnerText = document.getElementById("winner");
const nameStage = document.getElementById("nameStage");

const countdownSeconds = 15;
const idleSpeed = 30;
const juggleSpeed = 105;

let stageWidth = 0;
let stageHeight = 0;
let runningSelection = false;
let mode = "idle";
let lastFrame = performance.now();
let candidateFlashTimer = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function refreshStageSize() {
  const rect = nameStage.getBoundingClientRect();
  stageWidth = rect.width;
  stageHeight = rect.height;
}

function clearWinnerHighlight() {
  nodes.forEach((node) => {
    node.element.classList.remove("is-winner");
    node.element.classList.remove("is-candidate");
    node.element.style.zIndex = "";
  });
}

function clearSparks() {
  nameStage.querySelectorAll('.spark').forEach((spark) => spark.remove());
  if (sparkTimer) {
    clearInterval(sparkTimer);
    sparkTimer = null;
  }
}

function createEmptyState(message) {
  nameStage.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  nameStage.appendChild(empty);
}

function createNodes() {
  nameStage.innerHTML = "";
  nodes = names.map((name, index) => {
    const el = document.createElement("div");
    el.className = "name-node";
    el.textContent = name;
    el.style.background = palette[index % palette.length];
    nameStage.appendChild(el);

    const x = 80 + Math.random() * Math.max(stageWidth - 160, 1);
    const y = 70 + Math.random() * Math.max(stageHeight - 140, 1);
    const vx = (Math.random() - 0.5) * idleSpeed;
    const vy = (Math.random() - 0.5) * idleSpeed;

    return { name, element: el, x, y, vx, vy };
  });

  applyNodePositions();
}

function applyNodePositions() {
  nodes.forEach((node) => {
    node.element.style.left = `${node.x}px`;
    node.element.style.top = `${node.y}px`;
  });
}

function updateBouncePositions(dt, maxSpeed) {
  nodes.forEach((node) => {
    if (mode === "juggle") {
      node.vx += (Math.random() - 0.5) * 6;
      node.vy += (Math.random() - 0.5) * 6;
      node.vx = clamp(node.vx, -maxSpeed, maxSpeed);
      node.vy = clamp(node.vy, -maxSpeed, maxSpeed);
    }

    node.x += node.vx * dt;
    node.y += node.vy * dt;

    if (node.x < 55 || node.x > stageWidth - 55) {
      node.vx *= -1;
      node.x = clamp(node.x, 55, stageWidth - 55);
    }

    if (node.y < 40 || node.y > stageHeight - 40) {
      node.vy *= -1;
      node.y = clamp(node.y, 40, stageHeight - 40);
    }
  });
}

function animationLoop(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  if (nodes.length > 0) {
    if (mode === "juggle") {
      updateBouncePositions(dt, juggleSpeed);
    } else {
      updateBouncePositions(dt, idleSpeed);
    }
    applyNodePositions();
  }

  requestAnimationFrame(animationLoop);
}


function stopCandidateFlashing() {
  if (candidateFlashTimer) {
    clearInterval(candidateFlashTimer);
    candidateFlashTimer = null;
  }
  nodes.forEach((node) => node.element.classList.remove("is-candidate"));
}

function startCandidateFlashing() {
  stopCandidateFlashing();
  candidateFlashTimer = setInterval(() => {
    if (nodes.length < 1) {
      return;
    }
    nodes.forEach((node) => node.element.classList.remove("is-candidate"));
    const picks = Math.max(1, Math.floor(nodes.length * 0.2));
    for (let i = 0; i < picks; i += 1) {
      const node = nodes[Math.floor(Math.random() * nodes.length)];
      node.element.classList.add("is-candidate");
    }
  }, 85);
}

function spawnSparkBurst(winnerNode) {
  const sparks = 14;
  const baseX = winnerNode.x;
  const baseY = winnerNode.y;

  for (let i = 0; i < sparks; i += 1) {
    const spark = document.createElement('span');
    spark.className = 'spark';
    const angle = (Math.PI * 2 * i) / sparks + Math.random() * 0.25;
    const distance = 40 + Math.random() * 65;
    spark.style.left = `${baseX}px`;
    spark.style.top = `${baseY}px`;
    spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    spark.style.animationDelay = `${Math.random() * 0.08}s`;
    nameStage.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });
  }
}

function chooseWinner() {
  const winnerIndex = Math.floor(Math.random() * nodes.length);
  const winnerNode = nodes[winnerIndex];
  clearWinnerHighlight();
  stopCandidateFlashing();
  clearSparks();
  winnerNode.element.classList.add("is-winner");
  winnerNode.element.style.zIndex = "20";
  winnerText.textContent = `Winner: ${winnerNode.name}`;

  spawnSparkBurst(winnerNode);
  sparkTimer = setInterval(() => spawnSparkBurst(winnerNode), 280);
  setTimeout(() => {
    clearSparks();
  }, 2600);
}

function runSelection() {
  if (runningSelection || names.length < 2) {
    return;
  }

  runningSelection = true;
  mode = "juggle";
  spinButton.disabled = true;
  winnerText.textContent = "Winner: --";
  clearWinnerHighlight();
  stopCandidateFlashing();
  clearSparks();

  nodes.forEach((node) => {
    node.vx = (Math.random() - 0.5) * juggleSpeed;
    node.vy = (Math.random() - 0.5) * juggleSpeed;
  });

  startCandidateFlashing();

  let timeLeft = countdownSeconds;
  countdownText.textContent = `Picking in ${timeLeft}s`;

  const timer = setInterval(() => {
    timeLeft -= 1;
    countdownText.textContent = timeLeft > 0 ? `Picking in ${timeLeft}s` : "Picking now...";

    if (timeLeft <= 0) {
      clearInterval(timer);
      chooseWinner();
      mode = "idle";
      nodes.forEach((node) => {
        node.vx = (Math.random() - 0.5) * idleSpeed;
        node.vy = (Math.random() - 0.5) * idleSpeed;
      });
      countdownText.textContent = "Ready";
      spinButton.disabled = false;
      runningSelection = false;
    }
  }, 1000);
}

function extractNamesFromWorkbook(workbook) {
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

  return rows
    .flat()
    .map((value) => String(value || "").trim())
    .filter((value) => value && !/^FONT_SIZE\s*=\s*\d+(?:\.\d+)?$/i.test(value));
}

function applyWorkbook(arrayBuffer, sourceLabel) {
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellStyles: true });
  const excelNames = extractNamesFromWorkbook(workbook);

  if (excelNames.length < 2) {
    countdownText.textContent = `${sourceLabel} needs at least 2 names`;
    createEmptyState("Need at least 2 names in the sheet.");
    return false;
  }

  names = excelNames;
  refreshStageSize();
  createNodes();
  countdownText.textContent = `Loaded ${excelNames.length} names from ${sourceLabel}`;
  spinButton.disabled = false;
  return true;
}

async function tryFetchArrayBuffer(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.arrayBuffer();
}

function tryXhrArrayBuffer(path) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", path, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 0) {
        resolve(xhr.response);
        return;
      }
      reject(new Error(`XHR ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("XHR network error"));
    xhr.send();
  });
}

async function loadNamesFromFolder() {
  if (typeof XLSX === "undefined") {
    countdownText.textContent = "Excel parser failed to load";
    createEmptyState("XLSX library failed to load.");
    return;
  }

  const candidates = ["names.xls", "names.xlsx", "Names.xls", "Names.xlsx"];

  for (const candidate of candidates) {
    try {
      let arrayBuffer;
      try {
        arrayBuffer = await tryFetchArrayBuffer(candidate);
      } catch (fetchError) {
        if (window.location.protocol === "file:") {
          arrayBuffer = await tryXhrArrayBuffer(candidate);
        } else {
          throw fetchError;
        }
      }

      if (applyWorkbook(arrayBuffer, candidate)) {
        return;
      }
    } catch (error) {
      // Try next candidate.
    }
  }

  if (window.location.protocol === "file:") {
    countdownText.textContent = "File access blocked. Click 'Choose names.xls'.";
    createEmptyState("Browser blocked file access. Use 'Choose names.xls'.");
    return;
  }

  countdownText.textContent = "No valid names.xls found";
  createEmptyState("Could not find names.xls / names.xlsx in this folder.");
}

async function loadNamesFromPicker(file) {
  if (!file) {
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    applyWorkbook(arrayBuffer, file.name);
  } catch (error) {
    countdownText.textContent = "Could not read selected file";
    createEmptyState("Selected file could not be read.");
  }
}

spinButton.addEventListener("click", runSelection);
chooseFileButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  loadNamesFromPicker(file);
  fileInput.value = "";
});

window.addEventListener("resize", () => {
  refreshStageSize();
  if (names.length > 0) {
    createNodes();
  }
});

refreshStageSize();
createEmptyState("Loading names from Excel...");
requestAnimationFrame(animationLoop);
loadNamesFromFolder();
