let currentStep = 1;
let selectedShirt = null;

const steps = document.querySelectorAll(".setup-step");
const dots = document.querySelectorAll(".progress-dot");
const nextButtons = document.querySelectorAll(".next-button");
const shirtOptions = document.querySelectorAll(".shirt-option");

function showStep(stepNumber) {
  steps.forEach((step) => {
    step.classList.remove("active");
  });

  dots.forEach((dot) => {
    dot.classList.remove("active");
  });

  document.querySelector(`[data-step="${stepNumber}"]`).classList.add("active");

  dots[stepNumber - 1].classList.add("active");
}

nextButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (currentStep === 1) {
      const name = document.getElementById("nameInput").value.trim();

      if (name === "") {
        alert("Enter your name first!");
        return;
      }
    }

    if (currentStep === 2 && selectedShirt === null) {
      alert("Choose a shirt first!");
      return;
    }

    currentStep++;

    showStep(currentStep);
  });
});

shirtOptions.forEach((shirt) => {
  shirt.addEventListener("click", () => {
    shirtOptions.forEach((option) => {
      option.classList.remove("selected");
    });

    shirt.classList.add("selected");

    selectedShirt = shirt.dataset.shirt;
  });
});

document.querySelector(".next-button-final").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  const nameDisplay = document.getElementById("name");

  nameDisplay.textContent = name;

  currentStep = 3;
  showStep(currentStep);
});

document.getElementById("finishButton").addEventListener("click", () => {
  const nameInput = document.getElementById("nameInput").value.trim();

  const kidsModeProfile = {
    name: nameInput,
    shirt: selectedShirt,
  };

  localStorage.setItem("kidsModeProfile", JSON.stringify(kidsModeProfile));

  console.log("Kids Mode setup complete!", kidsModeProfile);

  window.location.href = "index.html";
});
