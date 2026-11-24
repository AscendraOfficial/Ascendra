
function init_studyspace() {
    const minutesInput = document.getElementById("pomodoro-minutes");
    const startButton = document.getElementById("pomodoro-start");
    const pauseButton = document.getElementById("stop-pomodoro");
    const resetButton = document.getElementById("restart-pomodoro");
    const timerDisplay = document.getElementById("pomodoro-display");
    const timeLeft = document.getElementById("timeLeft");
    const timerStatus = document.getElementById("pomodoro-status");
    const trackButtons = [...document.querySelectorAll(".studyspace-track")];
    const audio = document.getElementById("studyspace-audio");
    const song = document.getElementById("song");
    const playButton = document.getElementById("play");
    const backButton = document.getElementById("back-20");
    const forwardButton = document.getElementById("forward-20");
    const progress = document.getElementById("studyspace-progress");
    const elapsed = document.getElementById("music-elapsed");
    const duration = document.getElementById("music-duration");
    const musicStatus = document.getElementById("music-status");
    const tracks = Object.freeze({
        fluidscape: {
            title: "Fluidscape",
            artist: "Kevin MacLeod",
            src: "assets/music/Fluidscape.mp3",
            fallbackDuration: "30:21",
        },
        forestal: {
            title: "Forestal",
            artist: "Liborio Conti",
            src: "assets/music/Forestal.mp3",
            fallbackDuration: "7:25",
        },
    });
    let timerId = null;
    let remainingSeconds = 5 * 60;
    let sessionStarted = false;
    let activeTrackId = "fluidscape";

    function formatClock(totalSeconds) {
        const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function formatTrackTime(totalSeconds) {
        const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
        return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
    }

    function readTimerDuration() {
        const minutes = Number(minutesInput.value);
        return Number.isInteger(minutes) && minutes >= 1 && minutes <= 180 ? minutes * 60 : null;
    }

    function updateTimerDisplay() {
        timeLeft.textContent = formatClock(remainingSeconds);
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        timerDisplay.setAttribute(
            "aria-label",
            `${minutes} ${minutes === 1 ? "minute" : "minutes"} and ${seconds} ${seconds === 1 ? "second" : "seconds"} remaining`,
        );
    }

    function clearTimer() {
        if (timerId === null) return;
        clearInterval(timerId);
        timerId = null;
    }

    function setTimerRunning(running) {
        startButton.disabled = running;
        pauseButton.disabled = !running;
        minutesInput.disabled = sessionStarted;
        timerDisplay.classList.toggle("is-running", running);
    }

    function finishTimer() {
        clearTimer();
        remainingSeconds = 0;
        sessionStarted = false;
        setTimerRunning(false);
        updateTimerDisplay();
        timerStatus.textContent = "Focus session complete. Nice work!";
    }

    function tickTimer() {
        remainingSeconds -= 1;
        updateTimerDisplay();
        if (remainingSeconds <= 0) finishTimer();
    }

    function startTimer() {
        if (timerId !== null) return;

        if (!sessionStarted || remainingSeconds <= 0) {
            const durationInSeconds = readTimerDuration();
            if (durationInSeconds === null) {
                timerStatus.textContent = "Enter a whole number from 1 to 180 minutes.";
                minutesInput.focus();
                return;
            }
            remainingSeconds = durationInSeconds;
            sessionStarted = true;
            updateTimerDisplay();
        }

        timerId = setInterval(tickTimer, 1000);
        setTimerRunning(true);
        timerStatus.textContent = "Focus session in progress.";
    }

    function pauseTimer() {
        if (timerId === null) return;
        clearTimer();
        setTimerRunning(false);
        timerStatus.textContent = "Paused. Continue whenever you are ready.";
    }

    function resetTimer() {
        clearTimer();
        sessionStarted = false;
        remainingSeconds = readTimerDuration() || 5 * 60;
        setTimerRunning(false);
        updateTimerDisplay();
        timerStatus.textContent = "Ready when you are.";
    }

    function handleMinutesInput() {
        if (sessionStarted) return;
        const durationInSeconds = readTimerDuration();
        if (durationInSeconds === null) return;
        remainingSeconds = durationInSeconds;
        updateTimerDisplay();
        timerStatus.textContent = "Ready when you are.";
    }

    function updatePlayButton() {
        const isPlaying = !audio.paused && !audio.ended;
        const activeTrack = tracks[activeTrackId];
        playButton.innerHTML = isPlaying
            ? '<i class="fa-solid fa-pause" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-play" aria-hidden="true"></i>';
        playButton.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} ${activeTrack.title}`);
    }

    function updateMusicProgress() {
        const trackDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
        const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        progress.value = trackDuration ? String((currentTime / trackDuration) * 100) : "0";
        elapsed.textContent = formatTrackTime(currentTime);
        if (trackDuration) duration.textContent = formatTrackTime(trackDuration);
        progress.setAttribute("aria-valuetext", `${formatTrackTime(currentTime)} of ${formatTrackTime(trackDuration)}`);
    }

    async function toggleMusic() {
        if (!audio.paused) {
            audio.pause();
            musicStatus.textContent = "Music paused.";
            return;
        }

        try {
            await audio.play();
            musicStatus.textContent = `Playing ${tracks[activeTrackId].title}.`;
        } catch (error) {
            console.warn("Study Space could not start the selected track.", error);
            musicStatus.textContent = "The music could not start. Please try again.";
        }
    }

    function seekBy(seconds) {
        const trackDuration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
        audio.currentTime = Math.min(trackDuration, Math.max(0, audio.currentTime + seconds));
        updateMusicProgress();
    }

    function seekFromProgress() {
        if (!Number.isFinite(audio.duration)) return;
        audio.currentTime = (Number(progress.value) / 100) * audio.duration;
        updateMusicProgress();
    }

    function selectTrack(event) {
        const selectedButton = event.currentTarget;
        const selectedTrackId = selectedButton.dataset.track;
        const selectedTrack = tracks[selectedTrackId];

        if (!selectedTrack || selectedTrackId === activeTrackId) {
            playButton.focus();
            return;
        }

        audio.pause();
        activeTrackId = selectedTrackId;
        audio.src = selectedTrack.src;
        audio.load();
        song.textContent = `${selectedTrack.title} · ${selectedTrack.artist}`;
        duration.textContent = selectedTrack.fallbackDuration;
        progress.value = "0";
        elapsed.textContent = "0:00";
        trackButtons.forEach((button) => {
            const isSelected = button === selectedButton;
            button.classList.toggle("is-selected", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));
        });
        updatePlayButton();
        musicStatus.textContent = `${selectedTrack.title} selected.`;
        playButton.focus();
    }

    function handleTrackEnded() {
        updatePlayButton();
        musicStatus.textContent = `${tracks[activeTrackId].title} finished.`;
    }

    function handleAudioError() {
        musicStatus.textContent = `${tracks[activeTrackId].title} could not be loaded.`;
    }

    const seekBackward = () => seekBy(-20);
    const seekForward = () => seekBy(20);

    startButton.addEventListener("click", startTimer);
    pauseButton.addEventListener("click", pauseTimer);
    resetButton.addEventListener("click", resetTimer);
    minutesInput.addEventListener("input", handleMinutesInput);
    trackButtons.forEach((button) => button.addEventListener("click", selectTrack));
    playButton.addEventListener("click", toggleMusic);
    backButton.addEventListener("click", seekBackward);
    forwardButton.addEventListener("click", seekForward);
    progress.addEventListener("input", seekFromProgress);
    audio.addEventListener("timeupdate", updateMusicProgress);
    audio.addEventListener("loadedmetadata", updateMusicProgress);
    audio.addEventListener("play", updatePlayButton);
    audio.addEventListener("pause", updatePlayButton);
    audio.addEventListener("ended", handleTrackEnded);
    audio.addEventListener("error", handleAudioError);
    updateTimerDisplay();
    updateMusicProgress();
    updatePlayButton();

    return () => {
        clearTimer();
        audio.pause();
        startButton.removeEventListener("click", startTimer);
        pauseButton.removeEventListener("click", pauseTimer);
        resetButton.removeEventListener("click", resetTimer);
        minutesInput.removeEventListener("input", handleMinutesInput);
        trackButtons.forEach((button) => button.removeEventListener("click", selectTrack));
        playButton.removeEventListener("click", toggleMusic);
        backButton.removeEventListener("click", seekBackward);
        forwardButton.removeEventListener("click", seekForward);
        progress.removeEventListener("input", seekFromProgress);
        audio.removeEventListener("timeupdate", updateMusicProgress);
        audio.removeEventListener("loadedmetadata", updateMusicProgress);
        audio.removeEventListener("play", updatePlayButton);
        audio.removeEventListener("pause", updatePlayButton);
        audio.removeEventListener("ended", handleTrackEnded);
        audio.removeEventListener("error", handleAudioError);
    };
}
