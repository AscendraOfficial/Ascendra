const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");

const dot1 = document.getElementById("dot1");
const dot2 = document.getElementById("dot2");

const characterName = document.getElementById("characterName");

const step1Next = document.getElementById("step1Next");
const finishButton = document.getElementById("finishButton");

const shirtImage = document.getElementById("shirtImage");
const leftSleeve = document.getElementById("leftSleeve");
const rightSleeve = document.getElementById("rightSleeve");

const shirtButtons = document.querySelectorAll(".shirt-option");

let selectedShirt = "orange";

const shirts = {
  orange: {
    main: "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Orange%20shirt/shirt.png",

    left: "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Orange%20shirt/left_sleeve.png",

    right:
      "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Orange%20shirt/right_sleeve.png",
  },

  green: {
    main: "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Green%20shirt/shirt.png",

    left: "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Green%20shirt/left_sleeve.png",

    right:
      "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Green%20shirt/right_sleeve.png",
  },

  purple: {
    main: "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Purple%20shirt/shirt.png",

    left: "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Purple%20shirt/left_sleeve.png",

    right:
      "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Purple%20shirt/right_sleeve.png",
  },

  blue: {
    main: "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Blue%20shirt/shirt.png",

    left: "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Blue%20shirt/left_sleeve.png",

    right:
      "../../assets/images/Kids%20mode/Shirts/Plain%20colour%20shirts/Blue%20shirt/right_sleeve.png",
  },
};

function showShirt(shirtColour) {
  selectedShirt = shirtColour;

  const shirt = shirts[shirtColour];

  shirtImage.src = shirt.main;

  leftSleeve.src = shirt.left;

  rightSleeve.src = shirt.right;

  shirtButtons.forEach(function (button) {
    button.classList.remove("selected");

    if (button.dataset.shirt === shirtColour) {
      button.classList.add("selected");
    }
  });
}

step1Next.addEventListener("click", function () {
  if (characterName.value.trim() === "") {
    alert("Enter a character name first!");

    return;
  }

  step1.classList.remove("active");

  step2.classList.add("active");

  dot1.classList.remove("active");

  dot2.classList.add("active");
});

shirtButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    showShirt(button.dataset.shirt);
  });
});

finishButton.addEventListener("click", function () {
  const character = {
    name: characterName.value.trim(),

    shirt: selectedShirt,
  };

  localStorage.setItem("ascendraKidsModeCharacter", JSON.stringify(character));

  alert("Kids Mode setup complete!");
});

showShirt("orange");
