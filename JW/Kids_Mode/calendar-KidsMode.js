// ==========================================================
// CALENDAR DATE SETUP
// ==========================================================

// Gets today's date from the user's computer.
let today = new Date();

// Gets the current month.
// JavaScript counts January as 0 and December as 11.
let currentMonth = today.getMonth();

// Gets the current year.
let currentYear = today.getFullYear();


// ==========================================================
// MONTH NAMES
// ==========================================================

// Stores the names of all 12 months.
// These are used when displaying the calendar heading.
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];


// ==========================================================
// CONNECT JAVASCRIPT TO THE HTML
// ==========================================================

// Finds the calendar's month/year heading.
const calendarTitle = document.querySelector(".calendar-header h2");

// Finds the area where the calendar days will be created.
const calendarBody = document.getElementById("calendarBody");


// Finds the previous-month button.
const prevMonth = document.getElementById("prevMonth");

// Finds the next-month button.
const nextMonth = document.getElementById("nextMonth");


// Finds the Add Event button.
const addEventBtn = document.querySelector(".addEvent");

// Finds the event popup.
const popup = document.getElementById("eventPopup");

// Finds the Close button inside the popup.
const closePopup = document.getElementById("closePopup");

// Finds the Save button inside the popup.
const saveEvent = document.getElementById("saveEvent");


// Finds the input where the user enters the event name.
const eventTitleInput = document.getElementById("eventTitle");

// Finds the input where the user chooses the event date.
const eventDateInput = document.getElementById("eventDate");


// ==========================================================
// LOAD SAVED EVENTS
// ==========================================================

// Gets previously saved events from localStorage.
//
// If there are no saved events yet,
// an empty array is created instead.
let events = JSON.parse(localStorage.getItem("events")) || [];


// ==========================================================
// FLATPICKR DATE PICKER
// ==========================================================

// Turns the event date input into a Flatpickr date/time picker.
flatpickr("#eventDate", {

    // Allows the user to select a time as well as a date.
    enableTime: true,

    // Controls how the date/time is stored.
    dateFormat: "Y-m-d H:i",

    // Creates a separate, more user-friendly display input.
    altInput: true,

    // Controls how the date appears to the user.
    altFormat: "F j, Y h:i K",

    // Prevents the user from selecting dates before today.
    minDate: "today"
});


// ==========================================================
// RENDER CALENDAR
// ==========================================================

// Creates and displays the calendar for the current month.
function renderCalendar() {

    // Clears the existing calendar before creating it again.
    calendarBody.innerHTML = "";


    // Updates the calendar heading.
    // Example: "October 2026"
    calendarTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;


    // Finds which day of the week the month starts on.
    //
    // Sunday = 0
    // Monday = 1
    // Tuesday = 2
    // etc.
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();


    // Finds how many days are in the current month.
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();


    // Keeps track of which date number is currently being created.
    let date = 1;


    // Creates up to 6 rows in the calendar.
    for (let row = 0; row < 6; row++) {


        // Creates a new table row.
        const tr = document.createElement("tr");


        // Creates the 7 days within each week.
        for (let col = 0; col < 7; col++) {


            // Creates an individual calendar cell.
            const td = document.createElement("td");


            // ==================================================
            // EMPTY DAYS BEFORE THE FIRST DAY OF THE MONTH
            // ==================================================

            // If the first week has empty spaces before
            // the first day of the month, leave those cells empty.
            if (row === 0 && col < firstDay) {

                td.classList.add("empty-day");


            // ==================================================
            // EMPTY DAYS AFTER THE END OF THE MONTH
            // ==================================================

            // If there are no more dates left in the month,
            // leave the remaining cells empty.
            } else if (date > daysInMonth) {

                td.classList.add("empty-day");


            // ==================================================
            // NORMAL CALENDAR DATE
            // ==================================================

            } else {

                // Displays the date number.
                td.textContent = date;


                // ==================================================
                // HIGHLIGHT TODAY
                // ==================================================

                // Checks whether this date is today's date.
                if (
                    date === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear()
                ) {

                    // Adds the "today" CSS class.
                    td.classList.add("today");
                }


                // Displays any events belonging to this date.
                showEventsForDay(td, date);


                // Move to the next date.
                date++;
            }


            // Adds the completed date cell to the current row.
            tr.appendChild(td);
        }


        // Adds the completed row to the calendar.
        calendarBody.appendChild(tr);
    }
}


// ==========================================================
// DISPLAY EVENTS ON A CALENDAR DAY
// ==========================================================

// Finds events that belong to a particular calendar day
// and displays them inside that day's cell.
function showEventsForDay(dayCell, dayNumber) {


    // Checks every saved event.
    events.forEach(event => {


        // Converts the saved event date into a JavaScript Date.
        const eventDate = new Date(event.date);


        // Checks whether the event belongs to the current day.
        if (
            eventDate.getDate() === dayNumber &&
            eventDate.getMonth() === currentMonth &&
            eventDate.getFullYear() === currentYear
        ) {


            // Creates a new element to display the event.
            const eventText = document.createElement("div");


            // Gives the event its calendar-event CSS styling.
            eventText.classList.add("calendar-event");


            // Displays the event's title.
            eventText.textContent = event.title;


            // ==================================================
            // DELETE EVENT
            // ==================================================

            // Allows the user to click the event to delete it.
            eventText.onclick = () => {


                // Asks the user to confirm deletion.
                if (confirm(`Delete "${event.title}"?`)) {


                    // Removes the selected event from the events array.
                    events = events.filter(e => e.id !== event.id);


                    // Saves the updated event list to localStorage.
                    localStorage.setItem("events", JSON.stringify(events));


                    // Refreshes the calendar.
                    renderCalendar();
                }
            };


            // Adds the event to the calendar day.
            dayCell.appendChild(eventText);
        }
    });
}


// ==========================================================
// PREVIOUS MONTH BUTTON
// ==========================================================

// Runs when the user clicks the previous-month button.
prevMonth.onclick = () => {


    // Move one month backwards.
    currentMonth--;


    // If we move before January...
    if (currentMonth < 0) {

        // Move to December.
        currentMonth = 11;

        // Move back one year.
        currentYear--;
    }


    // Display the new month.
    renderCalendar();
};


// ==========================================================
// NEXT MONTH BUTTON
// ==========================================================

// Runs when the user clicks the next-month button.
nextMonth.onclick = () => {


    // Move one month forwards.
    currentMonth++;


    // If we move past December...
    if (currentMonth > 11) {

        // Move to January.
        currentMonth = 0;

        // Move forward one year.
        currentYear++;
    }


    // Display the new month.
    renderCalendar();
};


// ==========================================================
// OPEN ADD EVENT POPUP
// ==========================================================

// Runs when the user clicks "+ Add Event".
addEventBtn.onclick = () => {

    // Makes the popup visible.
    popup.style.display = "block";
};


// ==========================================================
// CLOSE ADD EVENT POPUP
// ==========================================================

// Runs when the user clicks "Close".
closePopup.onclick = () => {

    // Hides the popup.
    popup.style.display = "none";
};


// ==========================================================
// SAVE NEW EVENT
// ==========================================================

// Runs when the user clicks "Save".
saveEvent.onclick = () => {


    // Gets the event name and removes unnecessary spaces.
    const title = eventTitleInput.value.trim();


    // Gets the selected date and time.
    const dateValue = eventDateInput.value;


    // ==================================================
    // CHECK REQUIRED INFORMATION
    // ==================================================

    // Makes sure both the event name and date were entered.
    if (title === "" || dateValue === "") {

        // Shows an alert if something is missing.
        alert("Add an event name and date first!");

        // Stops the function from continuing.
        return;
    }


    // ==================================================
    // CREATE NEW EVENT
    // ==================================================

    // Adds the new event to the events array.
    events.push({

        // Creates a unique ID using the current time.
        id: Date.now(),

        // Stores the event name.
        title: title,

        // Stores the selected date and time.
        date: dateValue
    });


    // ==================================================
    // SAVE EVENT
    // ==================================================

    // Saves the updated events array to localStorage.
    localStorage.setItem("events", JSON.stringify(events));


    // Clears the event name input.
    eventTitleInput.value = "";


    // Clears the event date input.
    eventDateInput.value = "";


    // Closes the popup.
    popup.style.display = "none";


    // Refreshes the calendar so the new event appears.
    renderCalendar();
};


// ==========================================================
// INITIALISE CALENDAR
// ==========================================================

// Displays the calendar when the page first loads.
renderCalendar();
