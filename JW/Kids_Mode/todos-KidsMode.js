const addBtn = document.getElementById("add-btn");
const popup = document.getElementById("popup");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");

const taskInput = document.getElementById("task-input");
const dateInput = document.getElementById("date-input");
const todoList = document.getElementById("todo-list");

let todos = JSON.parse(localStorage.getItem("todos")) || [];

function saveTodos() {
    localStorage.setItem("todos", JSON.stringify(todos));
}

function showTodos() {
    todoList.innerHTML = "";

    if (todos.length === 0) {
        todoList.innerHTML = "<p>No tasks yet</p>";
        return;
    }

    todos.forEach(todo => {
        const card = document.createElement("div");
        card.classList.add("todo-card");

        if (todo.completed) {
            card.classList.add("completed");
        }

        card.innerHTML = `
            <div class="todo-info">
                <div class="todo-title">
                    ${todo.completed ? "✅" : "⬜"} ${todo.task}
                </div>
                <div class="todo-date">Due: ${todo.date}</div>
            </div>

            <button class="complete-btn">
                ${todo.completed ? "Undo" : "Done"}
            </button>

            <button class="delete-btn">🗑️</button>
        `;

        const completeBtn = card.querySelector(".complete-btn");
        const deleteBtn = card.querySelector(".delete-btn");

        completeBtn.onclick = () => {

            // Only award coins when completing the task
            if (!todo.completed) {
                addCoins(5);

                alert("Task completed! ✅\n+5 Ascendra Coins 🪙");
            }

            // Toggle completed status
            todo.completed = !todo.completed;

            saveTodos();
            showTodos();
        };

        deleteBtn.onclick = () => {
            todos = todos.filter(t => t.id !== todo.id);
            saveTodos();
            showTodos();
        };

        todoList.appendChild(card);
    });
}

addBtn.onclick = () => {
    popup.style.display = "block";
    taskInput.focus();
};

cancelBtn.onclick = () => {
    popup.style.display = "none";
    taskInput.value = "";
    dateInput.value = "";
};

saveBtn.onclick = () => {
    const task = taskInput.value.trim();
    const date = dateInput.value;

    if (task === "" || date === "") {
        alert("Add a task and due date first!");
        return;
    }

    todos.push({
        id: Date.now(),
        task: task,
        date: date,
        completed: false
    });

    saveTodos();
    showTodos();

    popup.style.display = "none";
    taskInput.value = "";
    dateInput.value = "";
};

showTodos();
