const targetDate = new Date("2027-01-01T00:00:00-05:00");

const countdownEl = document.getElementById("countdown");
const completeEl = document.getElementById("complete");
const monthsBoxEl = document.getElementById("months-box");
const daysBoxEl = document.getElementById("days-box");
const monthsEl = document.getElementById("months");
const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");

const pad2 = (value) => String(value).padStart(2, "0");

function getBreakdown(now, target) {
  let cursor = new Date(now.getTime());
  let months = 0;

  while (true) {
    const nextMonth = new Date(cursor.getTime());
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

    if (nextMonth <= target) {
      months += 1;
      cursor = nextMonth;
      continue;
    }

    break;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;
  let remainingMs = target.getTime() - cursor.getTime();

  const days = Math.floor(remainingMs / dayMs);
  remainingMs -= days * dayMs;
  const hours = Math.floor(remainingMs / hourMs);
  remainingMs -= hours * hourMs;
  const minutes = Math.floor(remainingMs / minuteMs);
  remainingMs -= minutes * minuteMs;
  const seconds = Math.floor(remainingMs / 1000);

  return { months, days, hours, minutes, seconds };
}

function renderCountdown(now, target) {
  const { months, days, hours, minutes, seconds } = getBreakdown(now, target);

  monthsEl.textContent = pad2(months);
  daysEl.textContent = pad2(days);
  hoursEl.textContent = pad2(hours);
  minutesEl.textContent = pad2(minutes);
  secondsEl.textContent = pad2(seconds);

  monthsBoxEl.hidden = months === 0;
  daysBoxEl.hidden = days === 0;
}

function completeCountdown() {
  renderCountdown(targetDate, targetDate);
  countdownEl.hidden = true;
  completeEl.hidden = false;
}

function tick() {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    completeCountdown();
    return false;
  }

  renderCountdown(now, targetDate);
  return true;
}

const running = tick();

if (running) {
  const intervalId = setInterval(() => {
    if (!tick()) {
      clearInterval(intervalId);
    }
  }, 1000);
}

const gameStartEl = document.getElementById("game-start");
const gameBoardEl = document.getElementById("game-board");
const gameTargetEl = document.getElementById("game-target");
const gameMessageEl = document.getElementById("game-message");
const gameScoreEl = document.getElementById("game-score");
const gameTimeEl = document.getElementById("game-time");
const gameBestEl = document.getElementById("game-best");
const gameLastEl = document.getElementById("game-last");
const screenFlashEl = document.getElementById("screen-flash");

const GAME_DURATION_SECONDS = 20;
const SCORE_STORAGE_KEY = "tap-rush-score-state-v1";
let gameScore = 0;
let gameTime = GAME_DURATION_SECONDS;
let gameTimerId = null;
let gameRunning = false;
let audioCtx = null;

function loadScoreState() {
  try {
    const raw = localStorage.getItem(SCORE_STORAGE_KEY);
    const legacyBest = Number(localStorage.getItem("tap-rush-best") || 0);

    if (!raw) {
      return { best: legacyBest, last: 0, hits: 0, misses: 0 };
    }

    const parsed = JSON.parse(raw);
    return {
      best: Number(parsed.best) || legacyBest,
      last: Number(parsed.last) || 0,
      hits: Number(parsed.hits) || 0,
      misses: Number(parsed.misses) || 0,
    };
  } catch {
    return { best: 0, last: 0, hits: 0, misses: 0 };
  }
}

const savedScoreState = loadScoreState();
let gameBest = savedScoreState.best;
let gameLast = savedScoreState.last;
let totalHits = savedScoreState.hits;
let totalMisses = savedScoreState.misses;

function saveScoreState() {
  localStorage.setItem(
    SCORE_STORAGE_KEY,
    JSON.stringify({
      best: gameBest,
      last: gameLast,
      hits: totalHits,
      misses: totalMisses,
    }),
  );
}

gameBestEl.textContent = String(gameBest);
gameLastEl.textContent = String(gameLast);

function randomPositionWithinBoard() {
  const boardRect = gameBoardEl.getBoundingClientRect();
  const size = 68;
  const maxX = Math.max(8, boardRect.width - size - 8);
  const maxY = Math.max(8, boardRect.height - size - 8);
  const x = Math.floor(Math.random() * maxX);
  const y = Math.floor(Math.random() * maxY);
  return { x, y };
}

function moveTarget() {
  const { x, y } = randomPositionWithinBoard();
  gameTargetEl.style.left = `${x}px`;
  gameTargetEl.style.top = `${y}px`;
}

function endGame() {
  gameRunning = false;
  gameTargetEl.hidden = true;
  gameStartEl.disabled = false;
  gameStartEl.textContent = "Play Again";
  gameLast = gameScore;
  gameLastEl.textContent = String(gameLast);

  if (gameScore > gameBest) {
    gameBest = gameScore;
    gameBestEl.textContent = String(gameBest);
    saveScoreState();
    gameMessageEl.textContent = "New best score!";
    return;
  }

  saveScoreState();
  gameMessageEl.textContent = "Round over. Try to beat your best.";
}

function startGame() {
  if (gameRunning) {
    return;
  }

  if (gameTimerId) {
    clearInterval(gameTimerId);
  }

  gameRunning = true;
  gameScore = 0;
  gameTime = GAME_DURATION_SECONDS;
  gameScoreEl.textContent = "0";
  gameTimeEl.textContent = String(gameTime);
  gameMessageEl.textContent = "Tap inside the target. Misses cost 1 point.";
  gameStartEl.disabled = true;
  gameTargetEl.hidden = false;
  moveTarget();

  gameTimerId = setInterval(() => {
    gameTime -= 1;
    gameTimeEl.textContent = String(gameTime);

    if (gameTime <= 0) {
      clearInterval(gameTimerId);
      gameTimerId = null;
      endGame();
    }
  }, 1000);
}

function flashScreen(type) {
  screenFlashEl.classList.remove("flash-hit", "flash-miss");
  void screenFlashEl.offsetWidth;
  screenFlashEl.classList.add(type === "hit" ? "flash-hit" : "flash-miss");
}

function ensureAudioContext() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) {
      audioCtx = new Ctor();
    }
  }

  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playHitSound() {
  if (!audioCtx) {
    return;
  }

  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.23, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  gain.connect(audioCtx.destination);

  const oscA = audioCtx.createOscillator();
  oscA.type = "triangle";
  oscA.frequency.setValueAtTime(980, now);
  oscA.frequency.exponentialRampToValueAtTime(1560, now + 0.12);
  oscA.connect(gain);
  oscA.start(now);
  oscA.stop(now + 0.18);

  const oscB = audioCtx.createOscillator();
  oscB.type = "square";
  oscB.frequency.setValueAtTime(740, now);
  oscB.frequency.exponentialRampToValueAtTime(1180, now + 0.1);
  oscB.connect(gain);
  oscB.start(now + 0.01);
  oscB.stop(now + 0.14);
}

function playMissSound() {
  if (!audioCtx) {
    return;
  }

  const now = audioCtx.currentTime;
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.32, now + 0.02);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  masterGain.connect(audioCtx.destination);

  const osc = audioCtx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);
  osc.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.42);

  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.42, audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i += 1) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.7;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(420, now);
  noiseFilter.Q.setValueAtTime(0.7, now);
  noise.connect(noiseFilter);
  noiseFilter.connect(masterGain);
  noise.start(now);
  noise.stop(now + 0.25);
}

function isTapInsideTarget(event) {
  const rect = gameTargetEl.getBoundingClientRect();
  const radius = rect.width / 2;
  const centerX = rect.left + radius;
  const centerY = rect.top + radius;
  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  return Math.hypot(dx, dy) <= radius;
}

function hitTarget() {
  if (!gameRunning) {
    return;
  }

  gameScore += 1;
  totalHits += 1;
  gameScoreEl.textContent = String(gameScore);
  flashScreen("hit");
  playHitSound();
  moveTarget();
  saveScoreState();
}

function missTarget() {
  if (!gameRunning) {
    return;
  }

  gameScore = Math.max(0, gameScore - 1);
  totalMisses += 1;
  gameScoreEl.textContent = String(gameScore);
  flashScreen("miss");
  playMissSound();
  saveScoreState();
}

function handleBoardTap(event) {
  if (!gameRunning) {
    return;
  }

  event.preventDefault();
  ensureAudioContext();

  if (isTapInsideTarget(event)) {
    hitTarget();
    return;
  }

  missTarget();
}

gameStartEl.addEventListener("click", startGame);
gameBoardEl.addEventListener("pointerdown", handleBoardTap);
document.addEventListener("gesturestart", (event) => {
  event.preventDefault();
});
document.addEventListener("dblclick", (event) => {
  event.preventDefault();
});
