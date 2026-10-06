/* ==========================================================
   ASCENDRA COIN SYSTEM
   Manages the user's Ascendra Coin balance using localStorage.
   ========================================================== */


/* ==========================================================
   CURRENT COIN BALANCE
   ========================================================== */

// Retrieve the saved coin balance from localStorage.
// If no balance exists, start with 0 coins.
let ascendraCoins = Number(localStorage.getItem("ascendraCoins")) || 0;


/* ==========================================================
   GET COINS
   ========================================================== */

// Returns the user's current Ascendra Coin balance.
function getCoins() {
    return ascendraCoins;
}


/* ==========================================================
   SAVE COINS
   ========================================================== */

// Saves the current coin balance to localStorage.
// This allows the balance to remain after the page is refreshed.
function saveCoins() {
    localStorage.setItem("ascendraCoins", ascendraCoins);
}


/* ==========================================================
   UPDATE COIN DISPLAY
   ========================================================== */

// Updates the visible coin balance and tooltip on the page.
function updateCoinDisplay() {

    // Find every element with the "coin-balance" class.
    // This allows multiple coin balances to be updated at once.
    document.querySelectorAll(".coin-balance").forEach(element => {

        // Display the current number of Ascendra Coins.
        element.textContent = ascendraCoins;
    });


    // Find the Ascendra Coin itself.
    const coin = document.querySelector(".ascendra-coin");


    // Only continue if an Ascendra Coin exists on the page.
    if (coin) {

        // Add a tooltip showing the current number of coins.
        coin.setAttribute(
            "title",
            `${ascendraCoins} Ascendra Coins`
        );
    }
}


/* ==========================================================
   ADD COINS
   ========================================================== */

// Adds a specified amount of coins to the user's balance.
function addCoins(amount) {

    // Convert the supplied amount into a number.
    amount = Number(amount);


    // Prevent invalid values or zero/negative amounts
    // from being added.
    if (isNaN(amount) || amount <= 0) {
        return;
    }


    // Increase the current coin balance.
    ascendraCoins += amount;


    // Save the new balance.
    saveCoins();

    // Update the visible balance on the page.
    updateCoinDisplay();
}


/* ==========================================================
   REMOVE COINS
   ========================================================== */

// Removes a specified amount of coins from the user's balance.
function removeCoins(amount) {

    // Convert the supplied amount into a number.
    amount = Number(amount);


    // Prevent invalid values or zero/negative amounts
    // from being removed.
    if (isNaN(amount) || amount <= 0) {
        return;
    }


    // Subtract the requested amount.
    // Math.max() prevents the balance from going below 0.
    ascendraCoins = Math.max(
        0,
        ascendraCoins - amount
    );


    // Save the new balance.
    saveCoins();

    // Update the visible balance on the page.
    updateCoinDisplay();
}


/* ==========================================================
   INITIALISE COIN SYSTEM
   ========================================================== */

// Update the coin display as soon as the JavaScript loads.
updateCoinDisplay();
