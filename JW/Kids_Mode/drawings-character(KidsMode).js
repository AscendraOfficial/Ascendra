export let moose;


export function createMoose() {

    moose = createGraphics(400, 400);

    moose.noStroke();


    // BODY

    moose.fill(139, 90, 43);
    moose.ellipse(190, 220, 170, 110);


    // NECK

    moose.fill(117, 69, 31);
    moose.rect(210, 100, 60, 130, 30);


    // HEAD

    moose.ellipse(260, 100, 100, 80);


    // MUZZLE

    moose.fill(92, 53, 28);
    moose.ellipse(295, 125, 60, 40);


    // NOSE

    moose.fill(36, 21, 13);
    moose.ellipse(320, 125, 25, 18);


    // EYES

    moose.fill(0);
    moose.ellipse(245, 100, 12, 12);
    moose.ellipse(275, 100, 12, 12);


    // EARS

    moose.fill(117, 69, 31);

    moose.ellipse(225, 65, 45, 25);
    moose.ellipse(295, 65, 45, 25);


    // ANTLERS

    moose.stroke(216, 185, 138);
    moose.strokeWeight(10);

    moose.line(235, 65, 215, 20);
    moose.line(215, 35, 195, 25);
    moose.line(215, 35, 225, 15);

    moose.line(285, 65, 305, 20);
    moose.line(305, 35, 295, 15);
    moose.line(305, 35, 325, 25);


    moose.noStroke();


    // LEGS

    moose.fill(117, 69, 31);

    moose.rect(120, 245, 30, 100, 15);
    moose.rect(160, 245, 30, 100, 15);
    moose.rect(215, 245, 30, 100, 15);
    moose.rect(255, 245, 30, 100, 15);


    // TAIL

    moose.ellipse(105, 200, 35, 35);
}
