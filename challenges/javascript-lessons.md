# JavaScript — 10 Beginner Lessons

For Natalie • Work through these lessons in order. Type the examples yourself, test them, and complete each challenge before moving on.

## Contents
- [Lesson 1: Introduction to JavaScript](#lesson-1)
- [Lesson 2: Variables](#lesson-2)
- [Lesson 3: Data Types](#lesson-3)
- [Lesson 4: Operators](#lesson-4)
- [Lesson 5: Conditions](#lesson-5)
- [Lesson 6: Functions](#lesson-6)
- [Lesson 7: Events](#lesson-7)
- [Lesson 8: Loops](#lesson-8)
- [Lesson 9: DOM Manipulation](#lesson-9)
- [Lesson 10: Mini Project: Click Counter](#lesson-10)

<a id="lesson-1"></a>
## Lesson 1: Introduction to JavaScript

### Learn
JavaScript makes webpages interactive. A script tag can load a JS file.

### Example
```javascript
<script src="script.js" defer></script>
// In script.js:
console.log('Hello, Natalie!');
```

### Your challenge
Open the browser console and print a message.

### Check yourself
- [ ] I can explain what the example does.
- [ ] I typed and tested it.
- [ ] I completed the challenge.

---

<a id="lesson-2"></a>
## Lesson 2: Variables

### Learn
let stores a value you can change; const stores a binding you cannot reassign.

### Example
```javascript
let score = 0;
const name = 'Natalie';
score = score + 1;
```

### Your challenge
Create a variable for your favorite game and log it.

### Check yourself
- [ ] I can explain what the example does.
- [ ] I typed and tested it.
- [ ] I completed the challenge.

---

<a id="lesson-3"></a>
## Lesson 3: Data Types

### Learn
Common types include strings, numbers, booleans, null, and undefined.

### Example
```javascript
const username = 'Natalie';
const level = 5;
const learning = true;
console.log(typeof level);
```

### Your challenge
Create one string, number, and boolean.

### Check yourself
- [ ] I can explain what the example does.
- [ ] I typed and tested it.
- [ ] I completed the challenge.

---

<a id="lesson-4"></a>
## Lesson 4: Operators

### Learn
Operators perform math and comparisons. === checks equality without type conversion.

### Example
```javascript
const total = 3 + 4;
console.log(total);
console.log(total === 7);
```

### Your challenge
Try subtraction, multiplication, and a comparison.

### Check yourself
- [ ] I can explain what the example does.
- [ ] I typed and tested it.
- [ ] I completed the challenge.

---

<a id="lesson-5"></a>
## Lesson 5: Conditions

### Learn
if and else let your program choose what happens.

### Example
```javascript
const points = 10;
if (points >= 10) {
  console.log('Level up!');
} else {
  console.log('Keep going!');
}
```

### Your challenge
Change points and predict the output.

### Check yourself
- [ ] I can explain what the example does.
- [ ] I typed and tested it.
- [ ] I completed the challenge.

---

<a id="lesson-6"></a>
## Lesson 6: Functions

### Learn
Functions group reusable instructions; parameters let you pass values.

### Example
```javascript
function greet(name) {
  return 'Hello, ' + name;
}
console.log(greet('Natalie'));
```

### Your challenge
Write a function that doubles a number.

### Check yourself
- [ ] I can explain what the example does.
- [ ] I typed and tested it.
- [ ] I completed the challenge.

---

<a id="lesson-7"></a>
## Lesson 7: Events

### Learn
Events run code when something happens, like a button click.

### Example
```javascript
const button = document.querySelector('#hello');
button.addEventListener('click', () => {
  alert('Hello!');
});
```

### Your challenge
Create an HTML button with id hello and connect the event.

### Check yourself
- [ ] I can explain what the example does.
- [ ] I typed and tested it.
- [ ] I completed the challenge.

---

<a id="lesson-8"></a>
## Lesson 8: Loops

### Learn
Loops repeat code. A for loop uses a start, condition, and update.

### Example
```javascript
for (let i = 1; i <= 5; i++) {
  console.log(i);
}
```

### Your challenge
Print the numbers 1 through 10.

### Check yourself
- [ ] I can explain what the example does.
- [ ] I typed and tested it.
- [ ] I completed the challenge.

---

<a id="lesson-9"></a>
## Lesson 9: DOM Manipulation

### Learn
The DOM lets JavaScript find and change HTML elements.

### Example
```javascript
const title = document.querySelector('#title');
title.textContent = 'Changed with JavaScript!';
```

### Your challenge
Add an h1 with id title and change its text with JS.

### Check yourself
- [ ] I can explain what the example does.
- [ ] I typed and tested it.
- [ ] I completed the challenge.

---

<a id="lesson-10"></a>
## Lesson 10: Mini Project: Click Counter

### Learn
Combine variables, events, and DOM changes to build a counter.

### Example
```javascript
// HTML: <button id="count">0</button>
let clicks = 0;
const button = document.querySelector('#count');
button.addEventListener('click', () => {
  clicks++;
  button.textContent = clicks;
});
```

### Your challenge
Build a working counter with a reset button as a bonus.

### Check yourself
- [ ] I can explain what the example does.
- [ ] I typed and tested it.
- [ ] I completed the challenge.

---
