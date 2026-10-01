/* =========================================================
   ALERT LIST
   Finds the HTML element where alerts will be displayed
   ========================================================= */

const alertList = document.getElementById("alertList");


/* =========================================================
   LOAD TO-DOS
   Gets the saved to-dos from the browser's localStorage
   ========================================================= */

// Gets the "todos" data from localStorage
// JSON.parse converts the saved text back into JavaScript data
// If there are no saved to-dos, use an empty array instead
const todos = JSON.parse(localStorage.getItem("todos")) || [];


/* =========================================================
   CLEAR EXISTING ALERTS
   Removes anything currently inside the alert list
   ========================================================= */

alertList.innerHTML = "";


/* =========================================================
   CHECK WHETHER THERE ARE ANY TO-DOS
   ========================================================= */

if (todos.length === 0) {

    // If there are no to-dos, display a friendly message
    alertList.innerHTML = "<p>No alerts 🎉</p>";

} else {


    /* =====================================================
       SORT TO-DOS BY DUE DATE
       Puts the earliest due date first
       ===================================================== */

    todos.sort((a, b) => new Date(a.date) - new Date(b.date));


    /* =====================================================
       CREATE AN ALERT FOR EACH TO-DO
       Loops through every saved to-do
       ===================================================== */

    todos.forEach(todo => {


        /* -------------------------------------------------
           CREATE ALERT CARD
           Creates a new <div> element for this alert
           ------------------------------------------------- */

        const card = document.createElement("div");


        // Gives the new div the "alert-card" CSS class
        // This allows your alerts CSS to style the card
        card.classList.add("alert-card");


        /* =================================================
           CALCULATE DUE DATE
           ================================================= */

        // Converts the to-do's date into a JavaScript Date object
        const dueDate = new Date(todo.date);

        // Gets today's date
        const today = new Date();


        /* -------------------------------------------------
           REMOVE THE TIME FROM BOTH DATES
           This makes the comparison based only on the date
           ------------------------------------------------- */

        // Sets the due date's time to midnight
        dueDate.setHours(0, 0, 0, 0);

        // Sets today's time to midnight
        today.setHours(0, 0, 0, 0);


        /* =================================================
           CALCULATE HOW MANY DAYS ARE LEFT
           ================================================= */

        // Finds the difference between the due date and today
        //
        // 1000 = milliseconds in one second
        // 60   = seconds in one minute
        // 60   = minutes in one hour
        // 24   = hours in one day
        //
        // Dividing by all of these converts milliseconds
        // into days

        const daysLeft = Math.floor(
            (dueDate - today) / (1000 * 60 * 60 * 24)
        );


        /* =================================================
           DETERMINE THE ALERT STATUS
           ================================================= */

        // Creates an empty variable that will contain
        // the appropriate status message
        let status = "";


        /* -------------------------------------------------
           OVERDUE
           ------------------------------------------------- */

        if (daysLeft < 0) {

            // The due date has already passed
            status = "🔴 Overdue";


        /* -------------------------------------------------
           DUE TODAY
           ------------------------------------------------- */

        } else if (daysLeft === 0) {

            // The due date is today
            status = "🟠 Due Today";


        /* -------------------------------------------------
           DUE TOMORROW
           ------------------------------------------------- */

        } else if (daysLeft === 1) {

            // The due date is tomorrow
            status = "🟡 Due Tomorrow";


        /* -------------------------------------------------
           DUE IN MORE THAN ONE DAY
           ------------------------------------------------- */

        } else {

            // Displays the number of days remaining
            status = `🟢 Due in ${daysLeft} days`;
        }


        /* =================================================
           BUILD THE ALERT CARD
           Adds the to-do information to the card
           ================================================= */

        card.innerHTML = `
            <h3>${todo.task}</h3>
            <p>📅 ${todo.date}</p>
            <p>${status}</p>
        `;


        /* =================================================
           ADD THE CARD TO THE PAGE
           ================================================= */

        // Places the completed alert card inside
        // <main id="alertList">
        alertList.appendChild(card);

    });

}
