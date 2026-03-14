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

const GAME_DURATION_SECONDS = 20;
let gameScore = 0;
let gameTime = GAME_DURATION_SECONDS;
let gameTimerId = null;
let gameRunning = false;
let gameBest = Number(localStorage.getItem("tap-rush-best") || 0);

gameBestEl.textContent = String(gameBest);

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

  if (gameScore > gameBest) {
    gameBest = gameScore;
    localStorage.setItem("tap-rush-best", String(gameBest));
    gameBestEl.textContent = String(gameBest);
    gameMessageEl.textContent = "New best score!";
    return;
  }

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
  gameMessageEl.textContent = "Tap as fast as you can.";
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

function hitTarget() {
  if (!gameRunning) {
    return;
  }

  gameScore += 1;
  gameScoreEl.textContent = String(gameScore);
  moveTarget();
}

gameStartEl.addEventListener("click", startGame);
gameTargetEl.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  hitTarget();
});
