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

function drawEmptyWheel(size, center, radius) {
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
  ctx.font = `${Math.max(radius * 0.08, 18)}px Segoe UI`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Drop names.xls in this folder", center, center - 12);
  ctx.fillText("Then refresh page", center, center + 20);
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
    drawEmptyWheel(size, center, radius);
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

async function loadNamesFromXls() {
  if (typeof XLSX === "undefined") {
    countdownText.textContent = "Excel parser failed to load";
    return;
  }

  try {
    const response = await fetch("names.xls", { cache: "no-store" });

    if (!response.ok) {
      countdownText.textContent = "names.xls not found";
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const excelNames = extractNamesFromWorkbook(workbook);

    if (excelNames.length < 2) {
      countdownText.textContent = "names.xls needs at least 2 names";
      return;
    }

    names = excelNames;
    spinButton.disabled = false;
    countdownText.textContent = `Loaded ${excelNames.length} names from names.xls`;
    drawWheel();
  } catch (error) {
    countdownText.textContent = "Could not read names.xls";
  }
}

spinButton.addEventListener("click", runSpin);

window.addEventListener("resize", () => {
  resizePending = true;
});

drawWheel();
requestAnimationFrame(animationFrame);
loadNamesFromXls();
