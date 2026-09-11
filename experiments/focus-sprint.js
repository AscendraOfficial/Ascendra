const timeDisplay = document.getElementById('timeDisplay');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const statusText = document.getElementById('statusText');
const presetButtons = document.querySelectorAll('[data-minutes]');

let duration = 5 * 60;
let remaining = duration;
let timer = null;

function updateDisplay() {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
  startButton.textContent = 'Start';
}

function startTimer() {
  if (timer) {
    stopTimer();
    statusText.textContent = 'Paused.';
    return;
  }

  if (remaining === 0) {
    remaining = duration;
  }

  startButton.textContent = 'Pause';
  statusText.textContent = 'Focus time.';

  timer = setInterval(() => {
    remaining--;
    updateDisplay();

    if (remaining <= 0) {
      stopTimer();
      statusText.textContent = 'Sprint complete!';
    }
  }, 1000);
}

startButton.addEventListener('click', startTimer);

resetButton.addEventListener('click', () => {
  stopTimer();
  remaining = duration;
  updateDisplay();
  statusText.textContent = 'Ready.';
});

presetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    stopTimer();
    duration = Number(button.dataset.minutes) * 60;
    remaining = duration;
    updateDisplay();
    statusText.textContent = `Set to ${button.dataset.minutes} minutes.`;
  });
});

updateDisplay();
