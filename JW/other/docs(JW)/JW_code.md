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
