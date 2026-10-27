# JW code

## Coding languages
Code made in the JW file primarily consists of front end (HTML, CSS, JavaScript).
**In the JW branch, we use modern coding languages, older coding languages won't
work in the JW branch.**

### HTML
The JW file follows a simple HTML structure. It includes a `<head>` tag including
a `<meta>` tag, a `<title>` tag, a `<link>` tag if there is CSS and a `<script>` tag
if there is JavaScript. All together, it looks something like this:
```html 
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Ascendra - Tasks, Habits and Goals</title>
    <link rel="stylesheet" href="style.css">
</head>
<!-- All of the pages content -->
<script src="script.js"></script>
</html>
```

### CSS
The JW branch's only CSS requirement is pretty much **always use css**. CSS helps make
Ascendra look better, it is crucial to add in any file. The JW branch uses classes and
ids if you spot any repeated ids, please report to the owner of the JW branch.
```css
/* Make sure to include this in every CSS file! */
body {
    font-family: sans-serif;
}
```

### JavaScript
The JW branch **uses modern JavaScript, anything like p5.js would not work**. JW also uses
the command `'use strict';` this enables a more 'strict' JavaScript browser. It also makes
code more readable.
```js
// put 'use strict'; at the start of each JavaScript file
'use strict';
// In strict mode, the functions const, var and let is enabled
const constExample = 1;
// var is not recommended, as it is used in older JavaScript, and some browsers won't accept it
let letExample = 1;
```

## Projects
The JW branch has many branch specific projects being worked on. Some of these include:

- Kids Mode

The JW branch is developing some Kids Mode specific features.

- Organization

The JW branch makes code from the real branch more organized.

- Special modifications

In the JW branch, there are many branch specific features that were made.


## Result of the code
Currently, JW code adds Kids Mode, featuring merchandise to buy from the shop, a new coin system,
and the new pages merch, merchandise, shop and character (still in development). You can access
Kids Mode through settings, where you go into parental controls (still in development) and get to
Kids Mode features where you can then proceed to Kids Mode. In Kids Mode, there are slight
modifications made to original Ascendra files.

Note: This will be updated over time.
