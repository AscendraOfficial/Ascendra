/* This is going to be all the merchandise you can buy and wear at the shop pleae make more if you can. */

/* This shirt is called 'nature', it shows a sun and grass floor on a blue background. */
function setup() {
  
    createCanvas(400, 400);

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

/* to paste a shirt simply write the code: image(name of variable, x, y, width, height); */
/* PS:What I mean by variable is what everything is stored in */
