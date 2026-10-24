# Ascendra Coding Guide
This is a guide about what type of code Ascendra uses and how it is structured.

## Types of Code
Ascendra primarily uses JavaScript, CSS and HTML. Other languages include JSON,
python, and SQL (sequel).

### HTML
This is the base coding language of Ascendra. Ascendra uses HTML5, the most modern
type of HTML. Our general HTML structure looks a bit like this:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- We use standard english characters -->
    <meta charset="UTF-8">
    <title>Ascendra - Tasks, Habits and goals</title>
    <!-- href can vary -->
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- all visible content is in the <body> tag -->
    <!-- src can vary -->
    <script src="script.js"></script>
</body>
</html>
```
