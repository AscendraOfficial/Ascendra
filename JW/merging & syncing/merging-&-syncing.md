# JW merging and syncing
Any files that you want to merge with the JW branch goes in this directory.
The owner of this branch will decide and discuss whether to put any of these
files in the actual JW branch and connect it with other files.

## Rules:
- Add `-merging` or `-syncing`at the end of each file in this directory.
- **Tab indentation only, no space indentation.**         
- **No large singular files like index.html, style.css and script.js.**
- Always merge or sync appropriate files.
- Never tinker with any code in any of the JW branch withjout asking,
only change your own file in this or the expirements branch

## Current merging projects
- sync real to JW (not one large file, multiple seperate files)
- merge dc and JW together (make an improved version of the real branch)

Note: **When something is put in this directory, please also tell in comments
*what* file it is and *how* you want the owner to sync or merge it.**

## Example:

### HTML
```html
<!-- Add this to the welcome page as a button to see part of the credits -->
<!DOCTYPE html>
<html lang="en">
    <head>
    <meta charset="UTF-8">
    <title>Example</title>
    <link rel="stylesheet" href="example.css">
</head>
<body>
    <h3 id="mini-credits">Made by Jayden Wang, Declan Chong and Natalie Wang.</h3>
</body
</html>
```
### CSS
```css
body {
    font-family: sans-serif;
}

#mini-credits {
    color: rgb(255, 0, 0); 
}
```

