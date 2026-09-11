const timeDisplay = document.getElementById('timeDisplay');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const fiveMinutes = document.getElementById('fiveMinutes');
const fifteenMinutes = document.getElementById('fifteenMinutes');
const twentyFiveMinutes = document.getElementById('twentyFiveMinutes');
const statusText = document.getElementById('statusText');

let duration = 300;
let remaining = duration;
let timer = null;

function updateDisplay() {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const minuteText = String(minutes).padStart(2, '0');
  const secondText = String(seconds).padStart(2, '0');

  timeDisplay.textContent = minuteText + ':' + secondText;
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
  startButton.textContent = 'Start';
}

function chooseTime(minutes) {
  stopTimer();
  duration = minutes * 60;
  remaining = duration;
  statusText.textContent = 'Ready.';
  updateDisplay();
}

function startTimer() {
  if (timer !== null) {
    stopTimer();
    statusText.textContent = 'Paused.';
    return;
  }

  startButton.textContent = 'Pause';
  statusText.textContent = 'Focus time.';

  timer = setInterval(function () {
    remaining = remaining - 1;
    updateDisplay();

    if (remaining <= 0) {
      stopTimer();
      statusText.textContent = 'Sprint complete!';
    }
  }, 1000);
}

function resetTimer() {
  stopTimer();
  remaining = duration;
  statusText.textContent = 'Ready.';
  updateDisplay();
}

startButton.addEventListener('click', startTimer);
resetButton.addEventListener('click', resetTimer);

fiveMinutes.addEventListener('click', function () {
  chooseTime(5);
});

fifteenMinutes.addEventListener('click', function () {
  chooseTime(15);
});

twentyFiveMinutes.addEventListener('click', function () {
  chooseTime(25);
});

updateDisplay();
