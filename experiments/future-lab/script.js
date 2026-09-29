const durationButtons = [...document.querySelectorAll(".duration-button")];
const focusTimer = document.querySelector("#focus-timer");
const focusToggle = document.querySelector("#focus-toggle");
const focusStatus = document.querySelector("#focus-status");

let selectedMinutes = 10;
let secondsRemaining = selectedMinutes * 60;
let timerId = null;

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function renderTimer() {
  focusTimer.textContent = formatTime(secondsRemaining);
}

function stopTimer(message) {
  clearInterval(timerId);
  timerId = null;
  focusToggle.textContent = "Start Quest";
  focusStatus.textContent = message;
}

durationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (timerId) {
      stopTimer("Quest paused because you changed the duration.");
    }

    durationButtons.forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");

    selectedMinutes = Number(button.dataset.minutes);
    secondsRemaining = selectedMinutes * 60;
    renderTimer();
  });
});

focusToggle.addEventListener("click", () => {
  if (timerId) {
    stopTimer("Quest paused. Resume whenever you're ready.");
    return;
  }

  if (secondsRemaining === 0) {
    secondsRemaining = selectedMinutes * 60;
  }

  focusToggle.textContent = "Pause Quest";
  focusStatus.textContent = "Quest active — protect the next few minutes from distractions.";

  timerId = setInterval(() => {
    secondsRemaining -= 1;
    renderTimer();

    if (secondsRemaining <= 0) {
      secondsRemaining = 0;
      renderTimer();
      stopTimer("Quest complete! Tiny victory acquired.");
    }
  }, 1000);
});

const tinyWinForm = document.querySelector("#tiny-win-form");
const tinyWinInput = document.querySelector("#tiny-win-input");
const tinyWinList = document.querySelector("#tiny-win-list");
const tinyWinXp = document.querySelector("#tiny-win-xp");

let xp = 0;

tinyWinForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (tinyWinList.children.length >= 3) {
    tinyWinInput.value = "";
    tinyWinInput.placeholder = "Three is the limit — keep it tiny!";
    return;
  }

  const item = document.createElement("li");
  item.className = "tiny-win-item";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  const label = document.createElement("span");
  label.textContent = tinyWinInput.value.trim();

  checkbox.addEventListener("change", () => {
    item.classList.toggle("done", checkbox.checked);
    xp += checkbox.checked ? 5 : -5;
    tinyWinXp.textContent = `${xp} XP`;
  });

  item.append(checkbox, label);
  tinyWinList.append(item);

  tinyWinInput.value = "";
  tinyWinInput.placeholder = "Add a tiny win...";
});

const energyButtons = [...document.querySelectorAll(".energy-button")];
const energyRecommendation = document.querySelector("#energy-recommendation");

const recommendations = {
  low: "Low-energy mode: try a 2-minute breathing reset, then pick one Tiny Win. No productivity boss battle required.",
  medium: "Medium-energy mode: knock out one to-do, then start a 10-minute Focus Quest to build momentum.",
  high: "High-energy mode: this is a good moment for a 25-minute Focus Quest or your most important task."
};

energyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    energyButtons.forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    energyRecommendation.textContent = recommendations[button.dataset.energy];
  });
});

renderTimer();
