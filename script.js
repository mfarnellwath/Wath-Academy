const defaultNames = [
  "Ava",
  "Noah",
  "Mia",
  "Liam",
  "Ethan",
  "Olivia",
  "Sophia",
  "Lucas",
  "Emma",
  "Mason",
  "Amelia",
  "James",
];

let names = [...defaultNames];

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
const applyNamesButton = document.getElementById("applyNamesButton");
const namesInput = document.getElementById("namesInput");
const countdownText = document.getElementById("countdown");
const winnerText = document.getElementById("winner");

const countdownSeconds = 15;
const fullTurn = Math.PI * 2;

let angle = 0;
let velocity = 0;
let spinning = false;
let resizePending = false;

function getParsedNames(raw) {
  return raw
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function setInputToCurrentNames() {
  namesInput.value = names.join("\n");
}

function applyNames() {
  if (spinning) {
    return;
  }

  const parsedNames = getParsedNames(namesInput.value);

  if (parsedNames.length < 2) {
    countdownText.textContent = "Please enter at least 2 names";
    return;
  }

  names = parsedNames;
  winnerText.textContent = "Winner: --";
  countdownText.textContent = "Ready";
  drawWheel();
}

function getWinnerFromAngle(currentAngle) {
  const sectorAngle = fullTurn / names.length;
  const normalized = ((-currentAngle + fullTurn / 4) % fullTurn + fullTurn) % fullTurn;
  const index = Math.floor(normalized / sectorAngle) % names.length;
  return names[index];
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
    ctx.font = `${Math.max(radius * 0.08, 15)}px Segoe UI`;
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
  if (spinning) {
    return;
  }

  spinning = true;
  spinButton.disabled = true;
  applyNamesButton.disabled = true;
  namesInput.disabled = true;
  winnerText.textContent = "Winner: --";

  velocity = 0.28;
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
        countdownText.textContent = "Ready";
        spinButton.disabled = false;
        applyNamesButton.disabled = false;
        namesInput.disabled = false;
        spinning = false;
      }

      requestAnimationFrame(decelerate);
    }
  }, 1000);
}

spinButton.addEventListener("click", runSpin);
applyNamesButton.addEventListener("click", applyNames);

window.addEventListener("resize", () => {
  resizePending = true;
});

setInputToCurrentNames();
drawWheel();
requestAnimationFrame(animationFrame);
