/* The Ascendra coin. */
function AscendraCoin() {
    noStroke();

    fill(250, 177, 20);
    ellipse(200, 200, 300, 300);

    fill(245, 226, 19);
    ellipse(200, 200, 270, 270);

    fill(240, 182, 24);
    triangle(194, 99, 117, 257, 269, 257);

    fill(245, 226, 19);
    triangle(156, 215, 193, 137, 233, 216);
}

function setup() {
    createCanvas(400, 400);

    AscendraCoin();
    /* image(what, x, y, width, height); */
}
