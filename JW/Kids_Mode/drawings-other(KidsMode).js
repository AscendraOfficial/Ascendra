let AscendraCoin;

function setup() {
    createCanvas(400, 400);

    // Create the coin as its own graphic
    AscendraCoin = createGraphics(400, 400);

    AscendraCoin.noStroke();

    AscendraCoin.fill(250, 177, 20);
    AscendraCoin.ellipse(200, 200, 300, 300);

    AscendraCoin.fill(245, 226, 19);
    AscendraCoin.ellipse(200, 200, 270, 270);

    AscendraCoin.fill(240, 182, 24);
    AscendraCoin.triangle(194, 99, 117, 257, 269, 257);

    AscendraCoin.fill(245, 226, 19);
    AscendraCoin.triangle(156, 215, 193, 137, 233, 216);
}

function draw() {
    background(220);

    // Draw the coin at 200 x 200
    image(AscendraCoin, 100, 100, 200, 200);
}
