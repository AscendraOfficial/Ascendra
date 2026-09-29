/* =========================
   ASCENDRA COIN SYSTEM
   ========================= */

let ascendraCoins = Number(localStorage.getItem("ascendraCoins")) || 0;


/* =========================
   GET COINS
   ========================= */

function getCoins() {
    return ascendraCoins;
}


/* =========================
   SAVE COINS
   ========================= */

function saveCoins() {
    localStorage.setItem("ascendraCoins", ascendraCoins);
}


/* =========================
   UPDATE COIN DISPLAY
   ========================= */

function updateCoinDisplay() {

    const coin = document.querySelector(".ascendra-coin");

    if (!coin) return;

    coin.setAttribute("title", `${ascendraCoins} Ascendra Coins`);

    coin.dataset.coins = ascendraCoins;
}


/* =========================
   ADD COINS
   ========================= */

function addCoins(amount) {

    amount = Number(amount);

    if (isNaN(amount) || amount <= 0) {
        return;
    }

    ascendraCoins += amount;

    saveCoins();
    updateCoinDisplay();
}


/* =========================
   REMOVE COINS
   ========================= */

function removeCoins(amount) {

    amount = Number(amount);

    if (isNaN(amount) || amount <= 0) {
        return;
    }

    ascendraCoins = Math.max(0, ascendraCoins - amount);

    saveCoins();
    updateCoinDisplay();
}


/* =========================
   INITIALISE
   ========================= */

updateCoinDisplay();
