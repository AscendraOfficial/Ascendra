function init_unwind() {
    const startButton = document.getElementById("start");
    const elapsedInput = document.getElementById("elapsed");
    const resetButton = document.getElementById("reset");
    const pauseButton = document.getElementById("pause");
    const timerDisplay = document.getElementById("timer-display");
    const timerCard = document.getElementById("display-card");
    const timerStatus = document.getElementById("timer-status");
    let timerId = null;
    let remainingSeconds = 5 * 60;
    let sessionInProgress = false;

    function readDuration() {
        const minutes = Number(elapsedInput.value);
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
            return null;
        }
        return minutes * 60;
    }

    function formatTime(seconds) {
        const safeSeconds = Math.max(0, Math.floor(seconds));
        const minutes = Math.floor(safeSeconds / 60);
        const remainder = safeSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    }

    function updateDisplay() {
        timerDisplay.textContent = formatTime(remainingSeconds);
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        timerCard.setAttribute(
            "aria-label",
            `${minutes} ${minutes === 1 ? "minute" : "minutes"} and ` + `${seconds} ${seconds === 1 ? "second" : "seconds"} remaining`,
        );
    }

    function setRunning(running) {
        startButton.disabled = running;
        pauseButton.disabled = !running;
        elapsedInput.disabled = sessionInProgress;
        timerCard.classList.toggle("is-running", running);
    }

    function clearTimer() {
        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }
    }

    function finishSession() {
        clearTimer();
        remainingSeconds = 0;
        sessionInProgress = false;
        setRunning(false);
        updateDisplay();

        const reward = recordZenSession();
        announceProgressionReward(reward);

        if (!reward.saved) {
            timerStatus.textContent = "Session complete. Your progress could not be saved.";
            return;
        }

        const unlockedNames = reward.newlyUnlocked.map((achievement) => achievement.name).join(" and ");
        timerStatus.textContent = unlockedNames
            ? `Session complete! Achievement unlocked: ${unlockedNames}.`
            : `Session complete! You earned ${reward.xpAwarded} XP.`;
    }

    function tick() {
        remainingSeconds--;
        updateDisplay();
        if (remainingSeconds <= 0) finishSession();
    }

    function startTimer() {
        if (timerId !== null) return;

        if (!sessionInProgress || remainingSeconds <= 0) {
            const duration = readDuration();
            if (duration === null) {
                timerStatus.textContent = "Enter a whole number from 1 to 120 minutes.";
                elapsedInput.focus();
                return;
            }
            remainingSeconds = duration;
            sessionInProgress = true;
            updateDisplay();
        }

        timerStatus.textContent = "Your quiet time has started.";
        timerId = setInterval(tick, 1000);
        setRunning(true);
    }

    function pauseTimer() {
        if (timerId === null) return;
        clearTimer();
        setRunning(false);
        timerStatus.textContent = "Paused. Start again when you are ready.";
    }

    function resetTimer() {
        clearTimer();
        sessionInProgress = false;
        remainingSeconds = readDuration() || 5 * 60;
        setRunning(false);
        updateDisplay();
        timerStatus.textContent = "Ready when you are.";
    }

    function handleDurationInput() {
        if (sessionInProgress) return;
        const duration = readDuration();
        if (duration !== null) {
            remainingSeconds = duration;
            updateDisplay();
            timerStatus.textContent = "Ready when you are.";
        }
    }

    startButton.addEventListener("click", startTimer);
    pauseButton.addEventListener("click", pauseTimer);
    resetButton.addEventListener("click", resetTimer);
    elapsedInput.addEventListener("input", handleDurationInput);
    updateDisplay();

    return () => {
        clearTimer();
        startButton.removeEventListener("click", startTimer);
        pauseButton.removeEventListener("click", pauseTimer);
        resetButton.removeEventListener("click", resetTimer);
        elapsedInput.removeEventListener("input", handleDurationInput);
    };
}
