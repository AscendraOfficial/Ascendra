let moose;

let mooseX = 100;
let mooseY = 50;
let mooseSize = 400;

let lastInteraction;
let sleeping = false;

function setup() {

    createCanvas(600, 500);

    moose = createGraphics(400, 400);

    lastInteraction = millis();

    drawMoose();
}


function drawMoose() {

    moose.clear();

    moose.noStroke();

    // Body
    moose.fill(139, 90, 43);
    moose.ellipse(190, 220, 170, 110);

    // Neck
    moose.rect(210, 100, 60, 130, 30);

    // Head
    moose.fill(117, 69, 31);
    moose.ellipse(260, 100, 100, 80);

    // Muzzle
    moose.fill(92, 53, 28);
    moose.ellipse(295, 125, 60, 40);

    // Nose
    moose.fill(36, 21, 13);
    moose.ellipse(320, 125, 25, 18);

    // Eyes
    moose.stroke(0);
    moose.strokeWeight(5);

    if (sleeping) {

        // Closed eyes
        moose.line(240, 100, 250, 105);
        moose.line(250, 105, 260, 100);

        moose.line(270, 100, 280, 105);
        moose.line(280, 105, 290, 100);

    } else {

        // Open eyes
        moose.noStroke();
        moose.fill(0);

        moose.ellipse(245, 100, 12, 12);
        moose.ellipse(275, 100, 12, 12);
    }

    moose.noStroke();

    // Ears
    moose.fill(117, 69, 31);

    moose.ellipse(225, 65, 45, 25);
    moose.ellipse(295, 65, 45, 25);

    // Antlers
    moose.stroke(216, 185, 138);
    moose.strokeWeight(10);

    moose.line(235, 65, 215, 20);
    moose.line(215, 35, 195, 25);
    moose.line(215, 35, 225, 15);

    moose.line(285, 65, 305, 20);
    moose.line(305, 35, 295, 15);
    moose.line(305, 35, 325, 25);

    moose.noStroke();

    // Legs
    moose.fill(117, 69, 31);

    moose.rect(120, 245, 30, 100, 15);
    moose.rect(160, 245, 30, 100, 15);
    moose.rect(215, 245, 30, 100, 15);
    moose.rect(255, 245, 30, 100, 15);

    // Tail
    moose.ellipse(105, 200, 35, 35);

    // Sleeping Zs
    if (sleeping) {

        moose.fill(80, 80, 80);

        moose.textSize(25);
        moose.text("Z", 300, 60);

        moose.textSize(18);
        moose.text("Z", 325, 40);
    }
}


function draw() {

    background(255);

    // Sleep after 5 seconds
    if (millis() - lastInteraction > 5000) {

        if (!sleeping) {

            sleeping = true;
            drawMoose();
        }
    }

    image(
        moose,
        mooseX,
        mooseY,
        mooseSize,
        mooseSize
    );
}


function mousePressed() {

    // Wake the moose when clicked
    if (
        mouseX > mooseX &&
        mouseX < mooseX + mooseSize &&
        mouseY > mooseY &&
        mouseY < mooseY + mooseSize
    ) {

        sleeping = false;
        lastInteraction = millis();

        drawMoose();
    }
}
