/* This is going to be all the merchandise you can buy and wear at the shop. */
/* This works when you store the code that draws something in a variable, then
you make an image with the variable being the 'what' part */

/* This shirt is called 'nature', it shows a sun and grass floor on a blue background. */
let natureShirt;

function setup() {
  
    createCanvas(400, 400);

    /* make sure to remember the this thing ⬇⬇⬇⬇⬇⬇ */
    /* In this case, the variable is 'natureShirt' */
    natureShirt = createGraphics(400, 400);

    natureShirt.noStroke();

    natureShirt.fill(3, 250, 238);
    natureShirt.rect(100, 50, 200, 300);

    natureShirt.triangle(100, 50, 40, 119, 100, 145);
    natureShirt.triangle(300, 50, 367, 126, 300, 145);

    natureShirt.fill(255, 255, 255);
    natureShirt.ellipse(200, 50, 75, 75);

    natureShirt.fill(255, 0, 0);
    natureShirt.ellipse(200, 200, 150, 150);

    natureShirt.fill(255, 187, 0);
    natureShirt.ellipse(200, 200, 140, 140);

    natureShirt.fill(235, 224, 9);
    natureShirt.ellipse(200, 200, 130, 130);

    natureShirt.fill(0, 255, 4);
    natureShirt.rect(100, 299, 200, 50);
}


/* This shirt is called sunset, it's essentially is a shirt decorated with a sunset. */
let sunsetShirt;

function setup() {

    createCanvas(400, 400);

    sunsetShirt = createGraphics(400, 400);

    sunsetShirt.noStroke();

    /* =========================
       MAIN PART
    ========================= */

    sunsetShirt.fill(255, 125, 90);
    sunsetShirt.rect(100, 50, 200, 300);


    /* =========================
       SHOULDER PARTS
    ========================= */

    sunsetShirt.fill(235, 85, 100);

    sunsetShirt.triangle(
        100, 50,
        40, 119,
        100, 145
    );

    sunsetShirt.triangle(
        300, 50,
        367, 126,
        300, 145
    );


    /* =========================
       COLLAR
    ========================= */

    sunsetShirt.fill(255, 245, 230);

    sunsetShirt.ellipse(
        200, 50,
        75, 75
    );


    /* =========================
       SUNSET DECORATION
    ========================= */

    /* Outer circle */

    sunsetShirt.fill(245, 70, 100);

    sunsetShirt.ellipse(
        200, 200,
        150, 150
    );


    /* Orange layer */

    sunsetShirt.fill(255, 130, 55);

    sunsetShirt.ellipse(
        200, 200,
        140, 140
    );


    /* Yellow layer */

    sunsetShirt.fill(255, 205, 60);

    sunsetShirt.ellipse(
        200, 200,
        130, 130
    );


    /* =========================
       SUN
    ========================= */

    sunsetShirt.fill(255, 245, 150);

    sunsetShirt.ellipse(
        200, 205,
        55, 55
    );


    /* =========================
       HORIZON
    ========================= */

    sunsetShirt.fill(170, 65, 95);

    sunsetShirt.rect(
        135, 220,
        130, 15
    );


    /* =========================
       BOTTOM SECTION
    ========================= */

    sunsetShirt.fill(115, 45, 90);

    sunsetShirt.rect(
        100, 299,
        200, 51
    );
}


/* This is the nintendo shirt, it is a red shirt with the iconic nintendo design on it. */
let nintendoShirt;

function setup() {

    createCanvas(400, 400);

    nintendoShirt = createGraphics(400, 400);

    nintendoShirt.noStroke();

    /* =========================
       MAIN PART
    ========================= */

    nintendoShirt.fill(230, 30, 45);

    nintendoShirt.rect(
        100, 50,
        200, 300
    );


    /* =========================
       SHOULDER PARTS
    ========================= */

    nintendoShirt.fill(190, 20, 35);

    nintendoShirt.triangle(
        100, 50,
        40, 119,
        100, 145
    );

    nintendoShirt.triangle(
        300, 50,
        367, 126,
        300, 145
    );


    /* =========================
       COLLAR
    ========================= */

    nintendoShirt.fill(255, 255, 255);

    nintendoShirt.ellipse(
        200, 50,
        75, 75
    );


    /* =========================
       CENTRE EMBLEM
    ========================= */

    nintendoShirt.fill(255, 255, 255);

    nintendoShirt.ellipse(
        200, 200,
        150, 150
    );


    /* =========================
       INNER RED CIRCLE
    ========================= */

    nintendoShirt.fill(230, 30, 45);

    nintendoShirt.ellipse(
        200, 200,
        130, 130
    );


    /* =========================
       CONTROLLER SYMBOL
    ========================= */

    /* Left controller */

    nintendoShirt.fill(80, 80, 90);

    nintendoShirt.rect(
        155, 175,
        32, 65,
        12
    );


    /* Right controller */

    nintendoShirt.rect(
        213, 175,
        32, 65,
        12
    );


    /* Controller centre */

    nintendoShirt.fill(255, 255, 255);

    nintendoShirt.rect(
        187, 190,
        26, 35,
        5
    );


    /* =========================
       CONTROLLER BUTTONS
    ========================= */

    nintendoShirt.fill(230, 30, 45);

    nintendoShirt.ellipse(
        229, 192,
        8, 8
    );

    nintendoShirt.ellipse(
        229, 211,
        8, 8
    );


    /* =========================
       BOTTOM SECTION
    ========================= */

    nintendoShirt.fill(35, 35, 45);

    nintendoShirt.rect(
        100, 299,
        200, 51
    );
}


/* This shirt is called fire, it is a shir twith a fire theme. */
let fireShirt;

function setup() {

    createCanvas(400, 400);

    fireShirt = createGraphics(400, 400);

    fireShirt.noStroke();

    /* =========================
       MAIN PART
    ========================= */

    fireShirt.fill(245, 75, 35);

    fireShirt.rect(
        100, 50,
        200, 300
    );


    /* =========================
       SHOULDER PARTS
    ========================= */

    fireShirt.fill(200, 40, 25);

    fireShirt.triangle(
        100, 50,
        40, 119,
        100, 145
    );

    fireShirt.triangle(
        300, 50,
        367, 126,
        300, 145
    );


    /* =========================
       COLLAR
    ========================= */

    fireShirt.fill(255, 225, 180);

    fireShirt.ellipse(
        200, 50,
        75, 75
    );


    /* =========================
       FIRE EMBLEM
    ========================= */

    /* Outer flame circle */

    fireShirt.fill(130, 25, 25);

    fireShirt.ellipse(
        200, 200,
        150, 150
    );


    /* Orange layer */

    fireShirt.fill(245, 75, 25);

    fireShirt.ellipse(
        200, 200,
        135, 135
    );


    /* Yellow layer */

    fireShirt.fill(255, 170, 25);

    fireShirt.ellipse(
        200, 205,
        115, 115
    );


    /* =========================
       FLAME
    ========================= */

    fireShirt.fill(255, 235, 90);

    fireShirt.beginShape();

    fireShirt.vertex(200, 155);

    fireShirt.vertex(220, 185);

    fireShirt.vertex(215, 205);

    fireShirt.vertex(235, 220);

    fireShirt.vertex(215, 240);

    fireShirt.vertex(185, 240);

    fireShirt.vertex(165, 220);

    fireShirt.vertex(185, 205);

    fireShirt.vertex(180, 180);

    fireShirt.vertex(200, 155);

    fireShirt.endShape(CLOSE);


    /* Inner flame */

    fireShirt.fill(255, 255, 220);

    fireShirt.beginShape();

    fireShirt.vertex(200, 180);

    fireShirt.vertex(211, 205);

    fireShirt.vertex(205, 225);

    fireShirt.vertex(195, 225);

    fireShirt.vertex(189, 207);

    fireShirt.vertex(200, 180);

    fireShirt.endShape(CLOSE);


    /* =========================
       BOTTOM SECTION
    ========================= */

    fireShirt.fill(125, 25, 25);

    fireShirt.rect(
        100, 299,
        200, 51
    );
}


/* This shirt is called ice, it is a shirt with an ice theme. */
let iceShirt;

function setup() {

    createCanvas(400, 400);

    iceShirt = createGraphics(400, 400);

    iceShirt.noStroke();

    /* =========================
       MAIN PART
    ========================= */

    iceShirt.fill(115, 220, 255);

    iceShirt.rect(
        100, 50,
        200, 300
    );


    /* =========================
       SHOULDER PARTS
    ========================= */

    iceShirt.fill(65, 170, 225);

    iceShirt.triangle(
        100, 50,
        40, 119,
        100, 145
    );

    iceShirt.triangle(
        300, 50,
        367, 126,
        300, 145
    );


    /* =========================
       COLLAR
    ========================= */

    iceShirt.fill(245, 255, 255);

    iceShirt.ellipse(
        200, 50,
        75, 75
    );


    /* =========================
       ICE EMBLEM
    ========================= */

    /* Outer circle */

    iceShirt.fill(40, 125, 210);

    iceShirt.ellipse(
        200, 200,
        150, 150
    );


    /* Light blue layer */

    iceShirt.fill(100, 205, 250);

    iceShirt.ellipse(
        200, 200,
        140, 140
    );


    /* Inner ice layer */

    iceShirt.fill(185, 240, 255);

    iceShirt.ellipse(
        200, 200,
        125, 125
    );


    /* =========================
       SNOWFLAKE
    ========================= */

    iceShirt.stroke(255, 255, 255);
    iceShirt.strokeWeight(8);
    iceShirt.strokeCap(ROUND);

    /* Vertical */

    iceShirt.line(
        200, 155,
        200, 245
    );

    /* Horizontal */

    iceShirt.line(
        155, 200,
        245, 200
    );

    /* Diagonal */

    iceShirt.line(
        168, 168,
        232, 232
    );

    iceShirt.line(
        232, 168,
        168, 232
    );


    /* =========================
       SNOWFLAKE BRANCHES
    ========================= */

    iceShirt.strokeWeight(5);

    /* Top */

    iceShirt.line(200, 165, 190, 175);
    iceShirt.line(200, 165, 210, 175);

    /* Bottom */

    iceShirt.line(200, 235, 190, 225);
    iceShirt.line(200, 235, 210, 225);

    /* Left */

    iceShirt.line(165, 200, 175, 190);
    iceShirt.line(165, 200, 175, 210);

    /* Right */

    iceShirt.line(235, 200, 225, 190);
    iceShirt.line(235, 200, 225, 210);


    /* =========================
       BOTTOM SECTION
    ========================= */

    iceShirt.noStroke();

    iceShirt.fill(40, 125, 210);

    iceShirt.rect(
        100, 299,
        200, 51
    );
}


/* Where all the shirts are: 
1. nature, line 3
2. sunset, line 38
3. nintendo, line 159
4. fire, line 303
5. ice, line 456
*/

/* to paste a shirt simply write the code: image(variable name, x, y, width, height) */
/* PS:What I mean by variable is what everything is stored in */
