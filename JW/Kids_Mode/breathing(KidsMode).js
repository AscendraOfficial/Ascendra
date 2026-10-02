// ==========================================================
// BREATHING EXERCISE DATA
// ==========================================================

// Stores all available breathing exercises.
// Each exercise contains:
// - title: The name displayed on the page
// - instructions: Instructions shown to the user
// - phases: The different stages of the breathing exercise

const exercises = {


    // ======================================================
    // BOX BREATHING
    // ======================================================

    box: {

        // Name displayed on the page
        title: "Box Breathing",

        // Instructions displayed to the user
        instructions: "Breathe in for 4, hold for 4, exhale for 4, hold for 4.",

        // Breathing phases
        phases: [

            // Breathe in for 4 seconds and enlarge the circle
            { text: "Breathe In", time: 4, scale: 1.4 },

            // Hold the breath for 4 seconds
            { text: "Hold", time: 4, scale: 1.4 },

            // Exhale for 4 seconds and return the circle to normal size
            { text: "Exhale", time: 4, scale: 1 },

            // Hold again for 4 seconds
            { text: "Hold", time: 4, scale: 1 }

        ]
    },


    // ======================================================
    // CALM BREATHING
    // ======================================================

    calm: {

        // Name displayed on the page
        title: "Calm Breathing",

        // Instructions displayed to the user
        instructions: "Breathe in for 5 seconds, then exhale for 5 seconds.",

        // Breathing phases
        phases: [

            // Breathe in for 5 seconds
            { text: "Breathe In", time: 5, scale: 1.4 },

            // Exhale for 5 seconds
            { text: "Exhale", time: 5, scale: 1 }

        ]
    },


    // ======================================================
    // 4-7-8 BREATHING
    // ======================================================

    relax: {

        // Name displayed on the page
        title: "4-7-8 Breathing",

        // Instructions displayed to the user
        instructions: "Breathe in for 4, hold for 7, exhale for 8.",

        // Breathing phases
        phases: [

            // Breathe in for 4 seconds
            { text: "Breathe In", time: 4, scale: 1.4 },

            // Hold the breath for 7 seconds
            { text: "Hold", time: 7, scale: 1.4 },

            // Exhale for 8 seconds
            { text: "Exhale", time: 8, scale: 1 }

        ]
    }
};


// ==========================================================
// CURRENT EXERCISE VARIABLES
// ==========================================================

// The exercise that is currently selected.
// Box Breathing is selected by default.
let currentExercise = exercises.box;


// Keeps track of which breathing phase is currently running.
let phaseIndex = 0;


// Stores the current countdown number.
let countdown = 0;


// Stores the timer used to count down each phase.
let timer = null;


// ==========================================================
// CONNECT JAVASCRIPT TO HTML
// ==========================================================

// Finds the exercise title in the HTML.
const exerciseTitle = document.getElementById("exerciseTitle");


// Finds the instructions paragraph in the HTML.
const instructions = document.getElementById("instructions");


// Finds the breathing circle in the HTML.
const circle = document.getElementById("circle");


// Finds the text showing the current breathing phase.
const phaseText = document.getElementById("phaseText");


// Finds the text showing the countdown.
const countdownText = document.getElementById("countdown");


// ==========================================================
// CHOOSE A BREATHING EXERCISE
// ==========================================================

// Runs when the user clicks one of the breathing exercise buttons.
function chooseExercise(type) {


    // Stop any breathing exercise that is currently running.
    stopBreathing();


    // Select the exercise chosen by the user.
    currentExercise = exercises[type];


    // Update the exercise title on the page.
    exerciseTitle.textContent = currentExercise.title;


    // Update the instructions on the page.
    instructions.textContent = currentExercise.instructions;


    // Reset the breathing phase to "Ready".
    phaseText.textContent = "Ready";


    // Reset the countdown to 0.
    countdownText.textContent = "0";


    // Return the breathing circle to its normal size.
    circle.style.transform = "scale(1)";
}


// ==========================================================
// START BREATHING
// ==========================================================

// Runs when the user clicks the Start button.
function startBreathing() {


    // Stop any existing timer before starting.
    stopBreathing();


    // Start from the first breathing phase.
    phaseIndex = 0;


    // Begin the current breathing phase.
    runPhase();
}


// ==========================================================
// RUN CURRENT BREATHING PHASE
// ==========================================================

// Controls one phase of the breathing exercise.
function runPhase() {


    // Get the current phase from the selected exercise.
    const phase = currentExercise.phases[phaseIndex];


    // Set the countdown to the length of the current phase.
    countdown = phase.time;


    // Display the current phase.
    phaseText.textContent = phase.text;


    // Display the starting countdown number.
    countdownText.textContent = countdown;


    // Change the size of the breathing circle.
    circle.style.transform = `scale(${phase.scale})`;


    // Run the countdown every 1 second.
    timer = setInterval(() => {


        // Decrease the countdown by 1.
        countdown--;


        // Update the countdown displayed on the page.
        countdownText.textContent = countdown;


        // Check whether the current phase has finished.
        if (countdown <= 0) {


            // Stop the current timer.
            clearInterval(timer);


            // Move to the next breathing phase.
            phaseIndex++;


            // Check whether all phases have been completed.
            if (phaseIndex >= currentExercise.phases.length) {


                // If the exercise is finished,
                // start again from the first phase.
                phaseIndex = 0;
            }


            // Start the next breathing phase.
            runPhase();
        }


    }, 1000);
}


// ==========================================================
// STOP BREATHING
// ==========================================================

// Stops the breathing exercise and resets everything.
function stopBreathing() {


    // Stop the countdown timer.
    clearInterval(timer);


    // Remove the timer reference.
    timer = null;


    // Reset to the first breathing phase.
    phaseIndex = 0;


    // Change the phase text back to "Ready".
    phaseText.textContent = "Ready";


    // Reset the countdown to 0.
    countdownText.textContent = "0";


    // Return the breathing circle to its normal size.
    circle.style.transform = "scale(1)";
}
