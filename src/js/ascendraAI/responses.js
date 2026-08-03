export const responses = {
  greeting: [
    (username, totalTodos, timeOfDay) =>
      `Welcome back, ${username}! You have ${totalTodos} to-do${totalTodos === 1 ? "" : "s"} left today.`,

    (username, totalTodos, timeOfDay) =>
      `${timeOfDay}, ${username}! Ready to get started? You have ${totalTodos} task${totalTodos === 1 ? "" : "s"} waiting.`,

    (username) => `Good to see you again, ${username}! Make sure you complete your habits today!`,

    (username) => `Hey ${username}! Let's make today productive!`,

    (username) => `Welcome back, ${username}!`,
  ],

  goodbye: [
    (username) => `See you later, ${username}!`,
    () => `Have an awesome day!`,
    (username) => `Take care, ${username}!`,
    () => `I'll be here when you get back.`,
  ],

  taskComplete: [
    () => `Nice work!`,
    () => `Task completed!`,
    () => `Another one down!`,
    (username) => `Way to ascend your day, ${username}!`,
    (remainingTodos) => `One down! ${remainingTodos} to go!`,
  ],

  allTasksComplete: [
    () => `🎉 You finished every task today!`,
    (username) => `Amazing work, ${username}! You're all caught up.`,
    () => `Mission accomplished!`,
  ],

  habitComplete: [
    () => `Habit completed!`,
    () => `Consistency is key!`,
    () => `Another habit done!`,
    (username) => `Great work, ${username}!`,
  ],

  allHabitsComplete: [() => `You've completed every habit today!`, () => `Awesome consistency!`, () => `Perfect! Every habit is finished.`],

  motivation: [
    () => `Small steps lead to big results.`,
    () => `Progress beats perfection.`,
    () => `Keep going—you've got this!`,
    () => `One task at a time.`,
    () => `Every little bit counts.`,
  ],

  reminder: [
    (totalTodos) => `You have ${totalTodos} task${totalTodos === 1 ? "" : "s"} left.`,
    () => `Don't forget to check your habits today.`,
    () => `Need help planning your day?`,
  ],

  journalReminder: [
    () => `How was your day today?`,
    () => `Don't forget to write in your journal.`,
    () => `A few sentences can go a long way.`,
  ],

  breakReminder: [() => `You've earned a short break.`, () => `Stretch your legs for a minute!`, () => `Remember to stay hydrated. 💧`],

  error: [() => `Oops... something went wrong.`, () => `That didn't quite work. Let's try again.`, () => `I ran into a little problem.`],

  loading: [() => `Loading...`, () => `Getting everything ready...`, () => `Just a second...`],

  thinking: [() => `Thinking...`, () => `Looking that up...`, () => `One moment...`],
};
