const todos = readUserJson(STORAGE_KEYS.TODOS, []);
const totalTodos = todos.length;
const username = getLoggedInUsername();
const hour = new Date().getHours();

const timeOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

const responses = {
    greeting: [
        `Welcome back, ${username}! You have ${totalTodos} to-do${totalTodos === 1 ? "" : "s"} left today.`,
        `${timeOfDay}, ${username}! Ready to get started?`,
        `Hey ${username}! Let's make today productive.`,
        `Good to see you again, ${username}!`,
        `${timeOfDay}! You're back!`
    ],

    goodbye: [
        `See you later, ${username}!`,
        `Have an awesome day!`,
        `Good luck with everything today!`,
        `Take care, ${username}!`,
        `I'll be here when you get back.`
    ],

    morning: [
        `Good morning, ${username}!`,
        `Rise and shine!`,
        `Ready for a fresh start today?`
    ],

    afternoon: [
        `Good afternoon, ${username}!`,
        `Hope your day's going well!`,
        `Keep up the great work!`
    ],

    evening: [
        `Good evening, ${username}!`,
        `Hope you had a great day!`,
        `Let's finish today strong!`
    ],

    taskComplete: [
        `Nice work!`,
        `Task completed!`,
        `Another one down!`,
        `Way to ascend your day, ${username}!`,
        `Keep it up!`
    ],

    allTasksComplete: [
        `🎉 You finished every task today!`,
        `Amazing work, ${username}! You're all caught up.`,
        `No more tasks left. Great job!`,
        `Mission accomplished!`
    ],

    habitComplete: [
        `Habit completed!`,
        `Consistency is key!`,
        `Another habit done!`,
        `Great work, ${username}!`
    ],

    allHabitsComplete: [
        `You've completed every habit today!`,
        `Awesome consistency!`,
        `Perfect! Every habit is finished.`
    ],

    streak: [
        `🔥 Your streak is now ${streak} day${streak === 1 ? "" : "s"}!`,
        `Keep the streak alive!`,
        `Don't break the chain!`
    ],

    achievement: [
        `🏆 Achievement unlocked!`,
        `Congratulations!`,
        `Another milestone reached!`,
        `You're making great progress!`
    ],

    motivation: [
        `Small steps lead to big results.`,
        `Progress beats perfection.`,
        `Keep going—you've got this!`,
        `One task at a time.`,
        `Every little bit counts.`
    ],

    reminder: [
        `You have ${totalTodos} to-do${totalTodos === 1 ? "" : "s"} left.`,
        `Don't forget to check your habits today.`,
        `Need help planning your day?`
    ],

    eventReminder: [
        `You have ${totalEvents} event${totalEvents === 1 ? "" : "s"} today.`,
        `Don't forget ${eventName}!`,
        `Your next event is coming up soon.`
    ],

    birthday: [
        `🎉 Happy Birthday, ${username}!`,
        `Don't forget ${birthdayName}'s birthday today!`,
        `Hope you have an amazing birthday!`
    ],

    journalReminder: [
        `How was your day today?`,
        `Don't forget to write in your journal.`,
        `A few sentences can go a long way.`
    ],

    studySession: [
        `Time to focus!`,
        `Let's get some work done.`,
        `Good luck with your study session!`
    ],

    breakReminder: [
        `You've earned a short break.`,
        `Stretch your legs for a minute!`,
        `Remember to stay hydrated. 💧`
    ],

    error: [
        `Oops... something went wrong.`,
        `That didn't quite work. Let's try again.`,
        `I ran into a little problem.`
    ],

    loading: [
        `Loading...`,
        `Getting everything ready...`,
        `Just a second...`
    ],

    thinking: [
        `Thinking...`,
        `Looking that up...`,
        `One moment...`
    ]
};