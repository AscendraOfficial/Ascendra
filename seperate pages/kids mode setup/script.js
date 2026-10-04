let currentStep = 1;
let selectedShirt = null;

const steps = document.querySelectorAll(".setup-step");
const dots = document.querySelectorAll(".progress-dot");
const nextButtons = document.querySelectorAll(".next-button");
const shirtOptions = document.querySelectorAll(".shirt-option");
const finalNextButton = document.querySelector(".next-button-final");
const finishButton = document.getElementById("finishButton");

// Orange shirt
const orangeMainShirt =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Orange%20shirt/shirt.png";

const orangeRightSleeve =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Orange%20shirt/right_sleeve.png";

const orangeLeftSleeve =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Orange%20shirt/left_sleeve.png";

const orangeShirt = {
  mainShirt: orangeMainShirt,

  sleeves: {
    rightSleeve: orangeRightSleeve,
    leftSleeve: orangeLeftSleeve,
  },
};

// Green shirt
const greenMainShirt =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Green%20shirt/shirt.png";

const greenRightSleeve =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Green%20shirt/right_sleeve.png";

const greenLeftSleeve =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Green%20shirt/left_sleeve.png";

const greenShirt = {
  mainShirt: greenMainShirt,

  sleeves: {
    rightSleeve: greenRightSleeve,
    leftSleeve: greenLeftSleeve,
  },
};

// Purple shirt
const purpleMainShirt =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Purple%20shirt/shirt.png";

const purpleRightSleeve =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Purple%20shirt/right_sleeve.png";

const purpleLeftSleeve =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Purple%20shirt/left_sleeve.png";

const purpleShirt = {
  mainShirt: purpleMainShirt,

  sleeves: {
    rightSleeve: purpleRightSleeve,
    leftSleeve: purpleLeftSleeve,
  },
};

// Blue shirt
const blueMainShirt =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Blue%20shirt/shirt.png";

const blueRightSleeve =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Blue%20shirt/right_sleeve.png";

const blueLeftSleeve =
  "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Blue%20shirt/left_sleeve.png";

const blueShirt = {
  mainShirt: blueMainShirt,

  sleeves: {
    rightSleeve: blueRightSleeve,
    leftSleeve: blueLeftSleeve,
  },
};

// All shirts
const shirts = {
  orange: orangeShirt,
  green: greenShirt,
  purple: purpleShirt,
  blue: blueShirt,
};

function showStep(stepNumber) {
  steps.forEach((step) => {
    step.classList.remove("active");
  });

  dots.forEach((dot) => {
    dot.classList.remove("active");
  });

  const step = document.querySelector(`[data-step="${stepNumber}"]`);

  if (step) {
    step.classList.add("active");
  }

  if (dots[stepNumber - 1]) {
    dots[stepNumber - 1].classList.add("active");
  }
}

nextButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const name = document.getElementById("nameInput").value.trim();

    if (name === "") {
      alert("Enter your name first!");
      return;
    }

    currentStep = 2;

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

    console.log("Selected shirt:", selectedShirt);
  });
});

finalNextButton.addEventListener("click", () => {
  if (selectedShirt === null) {
    alert("Choose a shirt first!");
    return;
  }

  const name = document.getElementById("nameInput").value.trim();
  const nameDisplay = document.getElementById("name");

  const currentShirtFilePath = shirts[selectedShirt];

  nameDisplay.textContent = name;

  console.log("Shirt:", selectedShirt);
  console.log("Main shirt:", currentShirtFilePath.mainShirt);
  console.log("Left sleeve:", currentShirtFilePath.sleeves.leftSleeve);
  console.log("Right sleeve:", currentShirtFilePath.sleeves.rightSleeve);

  const shirtImage = document.getElementById("shirtImage");

  shirtImage.setAttribute("src", currentShirtFilePath.mainShirt);

  currentStep = 3;

  showStep(currentStep);
});

finishButton.addEventListener("click", () => {
  const nameInput = document.getElementById("nameInput").value.trim();

  const currentShirtFilePath = shirts[selectedShirt];

  const kidsModeProfile = {
    name: nameInput,
    shirt: selectedShirt,
    shirtFiles: currentShirtFilePath,
  };

  localStorage.setItem("kidsModeProfile", JSON.stringify(kidsModeProfile));

  console.log("Kids Mode setup complete!", kidsModeProfile);

  window.location.href = "index.html";
});
