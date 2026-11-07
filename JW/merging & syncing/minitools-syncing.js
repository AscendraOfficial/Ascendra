 minitools: function init_minitools() {
    const flipButton = document.getElementById("flip");
    const rollButton = document.getElementById("roll");
    const generateButton = document.getElementById("gen");
    const minimumInput = document.getElementById("min");
    const maximumInput = document.getElementById("max");
    const coinOutput = document.getElementById("coin-flip-output");
    const diceOutput = document.getElementById("dice-roll-output");
    const numberOutput = document.getElementById("random-number-output");

    const initialProgression = syncProgressionFromActivity();
    renderProgressionSummary(initialProgression.state);

    function addMiniToolReward(resultText, toolId) {
      const reward = recordMiniToolUse(toolId);
      renderProgressionSummary(reward.state);

      if (!reward.xpAwarded) return resultText;

      const unlockedNames = reward.newlyUnlocked.map((achievement) => achievement.name).join(" and ");
      const unlockMessage = unlockedNames ? ` Achievement unlocked \u2014 ${unlockedNames}` : " First-use reward earned";

      return `${resultText}${unlockMessage} (+${reward.xpAwarded} XP)`;
    }

    function flipCoin() {
      const result = Math.random() < 0.5 ? "Heads!" : "Tails!";
      coinOutput.textContent = addMiniToolReward(result, "coin");
    }

    function rollDie() {
      const result = Math.floor(Math.random() * 6) + 1;
      diceOutput.textContent = addMiniToolReward("You rolled a " + result + ".", "dice");
    }

    function generateRandomNumber() {
      const minimumText = minimumInput.value.trim();
      const maximumText = maximumInput.value.trim();

      if (!minimumText || !maximumText) {
        numberOutput.textContent = "Enter both a minimum and maximum number.";
        return;
      }

      const minimum = Number(minimumText);
      const maximum = Number(maximumText);
      const range = maximum - minimum + 1;

      if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum)) {
        numberOutput.textContent = "Use whole numbers within the safe number range.";
        return;
      }

      if (minimum > maximum) {
        numberOutput.textContent = "The minimum must be less than or equal to the maximum.";
        return;
      }

      if (!Number.isSafeInteger(range) || range < 1) {
        numberOutput.textContent = "Choose a smaller range of numbers.";
        return;
      }

      const result = Math.floor(Math.random() * range) + minimum;

      numberOutput.textContent = addMiniToolReward("Your random number is " + result + ".", "random-number");
    }

    flipButton.addEventListener("click", flipCoin);
    rollButton.addEventListener("click", rollDie);
    generateButton.addEventListener("click", generateRandomNumber);

    return () => {
      flipButton.removeEventListener("click", flipCoin);
      rollButton.removeEventListener("click", rollDie);
      generateButton.removeEventListener("click", generateRandomNumber);
    };
  },
  privacy: function init_privacy() {},
  terms: function init_terms() {},
  about: function init_about() {},
  credits: function init_credits() {},
  roadmap: function init_roadmap() {},
  comingsoon: function init_comingsoon() {},
  projects: function init_projects() {},
};
