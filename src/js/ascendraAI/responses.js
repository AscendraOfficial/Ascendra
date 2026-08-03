const todos = readUserJson(STORAGE_KEYS.TODOS, []);
const totalTodos = todos.length;
const username = getLoggedInUsername();
const hour = new Date().getHours();

const timeOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

const responses = {
  greeting: [
    `Welcome back ${username}! You have ${totalTodos} to-do${totalTodos === 1 ? "" : "s"} left to do.`,
    `Good to see you again! Make sure you do all of your habits!`,
    `${timeOfDay}, ${username}!`,
  ],

  taskComplete: [`One down, ${totalTodos} to go!`, `Nice work!`, `Way to ascend your day, ${username}!`],
};