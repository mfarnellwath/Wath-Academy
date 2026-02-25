let names = [];

const colors = [
  "#ff595e",
  "#ff924c",
  "#ffca3a",
  "#8ac926",
  "#52b788",
  "#1982c4",
  "#4267ac",
  "#6a4c93",
  "#b5179e",
  "#f15bb5",
  "#00bbf9",
  "#00f5d4",
];

const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const spinButton = document.getElementById("spinButton");
const countdownText = document.getElementById("countdown");
const winnerText = document.getElementById("winner");

const countdownSeconds = 15;
const fullTurn = Math.PI * 2;
const idleVelocity = 0.012;
const activeVelocity = 0.28;

let angle = 0;
let velocity = idleVelocity;
let spinning = false;
let resizePending = false;

function getWinnerFromAngle(currentAngle) {
  const sectorAngle = fullTurn / names.length;
  const normalized = ((-currentAngle + fullTurn / 4) % fullTurn + fullTurn) % fullTurn;
  const index = Math.floor(normalized / sectorAngle) % names.length;
  return names[index];
}

function drawEmptyWheel(center, radius) {
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, fullTurn);
  ctx.fillStyle = "#1e2a52";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(center, center, radius, 0, fullTurn);
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.max(radius * 0.075, 17)}px Segoe UI`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Put names.xls beside index.html", center, center - 12);
  ctx.fillText("(or run with a local web server)", center, center + 20);
}

function drawWheel() {
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(canvas.clientWidth, canvas.clientHeight);
  canvas.width = size * dpr;
  canvas.height = size * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const radius = center - 8;

  if (names.length < 2) {
    drawEmptyWheel(center, radius);
    return;
  }

  const arc = fullTurn / names.length;

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(angle);

  for (let i = 0; i < names.length; i += 1) {
    const start = i * arc;
    const end = start + arc;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    ctx.save();
    ctx.rotate(start + arc / 2);
    ctx.fillStyle = "#111";
    ctx.font = `${Math.max(radius * 0.08, 14)}px Segoe UI`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(names[i], radius * 0.9, 0);
    ctx.restore();
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(center, center, radius, 0, fullTurn);
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(center, center, radius * 0.1, 0, fullTurn);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

function animationFrame() {
  angle += velocity;

  if (angle >= fullTurn) {
    angle -= fullTurn;
  }

  drawWheel();

  if (resizePending) {
    resizePending = false;
    drawWheel();
  }

  requestAnimationFrame(animationFrame);
}

function runSpin() {
  if (spinning || names.length < 2) {
    return;
  }

  spinning = true;
  spinButton.disabled = true;
  winnerText.textContent = "Winner: --";

  velocity = activeVelocity;
  let timeLeft = countdownSeconds;
  countdownText.textContent = `Landing in ${timeLeft}s`;

  const timer = setInterval(() => {
    timeLeft -= 1;
    countdownText.textContent =
      timeLeft > 0 ? `Landing in ${timeLeft}s` : "Landing now...";

    if (timeLeft <= 0) {
      clearInterval(timer);

      const winnerIndex = Math.floor(Math.random() * names.length);
      const sectorAngle = fullTurn / names.length;
      const winnerCenter = winnerIndex * sectorAngle + sectorAngle / 2;

      const pointerAngle = fullTurn / 4;
      const minimumSpins = 7;
      const normalizedCurrent = ((angle % fullTurn) + fullTurn) % fullTurn;
      const targetBase = pointerAngle - winnerCenter;
      const targetOffset =
        ((targetBase - normalizedCurrent) % fullTurn + fullTurn) % fullTurn;
      const totalRotation = minimumSpins * fullTurn + targetOffset;

      const durationMs = 3600;
      const start = performance.now();
      const startAngle = angle;

      function easeOutCubic(t) {
        return 1 - (1 - t) ** 3;
      }

      function decelerate(now) {
        const progress = Math.min((now - start) / durationMs, 1);
        const eased = easeOutCubic(progress);
        angle = startAngle + totalRotation * eased;
        velocity = 0;
        drawWheel();

        if (progress < 1) {
          requestAnimationFrame(decelerate);
          return;
        }

        angle %= fullTurn;
        const winner = getWinnerFromAngle(angle);
        winnerText.textContent = `Winner: ${winner}`;
        countdownText.textContent = "Auto-spinning";
        velocity = idleVelocity;
        spinButton.disabled = false;
        spinning = false;
      }

      requestAnimationFrame(decelerate);
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
    .filter(Boolean);
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

async function loadNamesFromXls() {
  if (typeof XLSX === "undefined") {
    countdownText.textContent = "Excel parser failed to load";
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

      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const excelNames = extractNamesFromWorkbook(workbook);

      if (excelNames.length < 2) {
        continue;
      }

      names = excelNames;
      spinButton.disabled = false;
      countdownText.textContent = `Loaded ${excelNames.length} names from ${candidate}`;
      drawWheel();
      return;
    } catch (error) {
      // Try the next candidate filename.
    }
  }

  if (window.location.protocol === "file:") {
    countdownText.textContent =
      "Could not read names.xls via file://. Run a local server in this folder.";
    return;
  }

  countdownText.textContent = "No valid names.xls found (need at least 2 names)";
}

spinButton.addEventListener("click", runSpin);

window.addEventListener("resize", () => {
  resizePending = true;
});

drawWheel();
requestAnimationFrame(animationFrame);
loadNamesFromXls();
