// Character renderer for Ascendra Kids Mode.
// The AI system stays separate from the character.

let currentCharacter = "fox";
let characterContainer = null;
let activeRenderer = null;
let animationFrame = null;


// ============================================================
// INITIALISE CHARACTER SYSTEM
// ============================================================

export function initCharacterSystem(container, character = "fox") {
    characterContainer = container;

    setCharacter(character);

    if (!animationFrame) {
        animationFrame = requestAnimationFrame(updateCharacter);
    }
}


// ============================================================
// CHANGE CHARACTER
// ============================================================

export function setCharacter(character) {
    if (!characterContainer) return;

    currentCharacter = character;

    characterContainer.innerHTML = "";

    if (activeRenderer?.destroy) {
        activeRenderer.destroy();
    }

    activeRenderer = null;

    if (character === "moose") {
        activeRenderer = createMooseCharacter(characterContainer);
    } else {
        activeRenderer = createFoxCharacter(characterContainer);
    }
}


// ============================================================
// UPDATE CHARACTER
// ============================================================

function updateCharacter() {
    if (activeRenderer?.update) {
        activeRenderer.update();
    }

    animationFrame = requestAnimationFrame(updateCharacter);
}


// ============================================================
// GET ASCENDRA AI STATE
// ============================================================

function getAIState() {
    const companion = document.getElementById("ascendra-ai");

    if (!companion) {
        return {
            speaking: false,
            jumping: false,
            wagging: false,
            looking: false,
            stretching: false,
            napping: false,
            roaming: false
        };
    }

    return {
        speaking: companion.classList.contains("is-speaking"),
        jumping: companion.classList.contains("is-jumping"),
        wagging: companion.classList.contains("is-tail-wagging"),
        looking: companion.classList.contains("is-looking-around"),
        stretching: companion.classList.contains("is-stretching"),
        napping: companion.classList.contains("is-napping"),
        roaming: companion.classList.contains("is-roaming")
    };
}


// ============================================================
// FOX
// ============================================================

function createFoxCharacter(container) {
    const fox = document.createElement("div");

    fox.className = "kids-ai-character kids-ai-fox";

    fox.innerHTML = `
        <span class="kids-fox-tail"></span>

        <span class="kids-fox-body"></span>

        <span class="kids-fox-leg kids-fox-leg-back-left"></span>
        <span class="kids-fox-leg kids-fox-leg-back-right"></span>
        <span class="kids-fox-leg kids-fox-leg-front-left"></span>
        <span class="kids-fox-leg kids-fox-leg-front-right"></span>

        <span class="kids-fox-head"></span>

        <span class="kids-fox-ears">
            <span class="kids-fox-ear kids-fox-ear-left"></span>
            <span class="kids-fox-ear kids-fox-ear-right"></span>
        </span>

        <span class="kids-fox-eyes"></span>
        <span class="kids-fox-mouth"></span>
    `;

    container.appendChild(fox);

    return {
        update() {
            const state = getAIState();

            fox.classList.toggle("is-speaking", state.speaking);
            fox.classList.toggle("is-jumping", state.jumping);
            fox.classList.toggle("is-tail-wagging", state.wagging);
            fox.classList.toggle("is-looking-around", state.looking);
            fox.classList.toggle("is-stretching", state.stretching);
            fox.classList.toggle("is-napping", state.napping);
            fox.classList.toggle("is-roaming", state.roaming);
        },

        destroy() {
            fox.remove();
        }
    };
}


// ============================================================
// MOOSE
// ============================================================

function createMooseCharacter(container) {
    const wrapper = document.createElement("div");

    wrapper.className = "kids-ai-character kids-ai-moose";

    container.appendChild(wrapper);

    const canvas = document.createElement("canvas");

    canvas.width = 400;
    canvas.height = 400;

    wrapper.appendChild(canvas);

    const ctx = canvas.getContext("2d");

    let time = 0;

    function drawMoose(state) {
        time += 0.06;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let bounce = 0;
        let headRotation = 0;
        let bodyScaleX = 1;
        let bodyScaleY = 1;

        // Movement
        if (state.jumping) {
            bounce = Math.sin(time * 7) * 10;
        }

        // Looking around
        if (state.looking) {
            headRotation = Math.sin(time * 4) * 0.12;
        }

        // Stretching
        if (state.stretching) {
            bodyScaleX = 1.08;
            bodyScaleY = 0.9;
        }

        ctx.save();

        ctx.translate(0, bounce);


        // ====================================================
        // BODY
        // ====================================================

        ctx.save();

        ctx.translate(190, 220);
        ctx.scale(bodyScaleX, bodyScaleY);

        ctx.fillStyle = "rgb(139, 90, 43)";

        ctx.beginPath();
        ctx.ellipse(
            0,
            0,
            85,
            55,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();


        // ====================================================
        // LEGS
        // ====================================================

        ctx.fillStyle = "rgb(117, 69, 31)";

        drawRoundedRect(ctx, 120, 245, 30, 100, 15);
        drawRoundedRect(ctx, 160, 245, 30, 100, 15);
        drawRoundedRect(ctx, 215, 245, 30, 100, 15);
        drawRoundedRect(ctx, 255, 245, 30, 100, 15);


        // ====================================================
        // TAIL
        // ====================================================

        ctx.fillStyle = "rgb(117, 69, 31)";

        ctx.beginPath();

        ctx.ellipse(
            105,
            200,
            18,
            18,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // ====================================================
        // HEAD
        // ====================================================

        ctx.save();

        ctx.translate(260, 100);
        ctx.rotate(headRotation);


        // Neck
        ctx.fillStyle = "rgb(117, 69, 31)";

        drawRoundedRect(
            ctx,
            -50,
            0,
            60,
            130,
            30
        );


        // Head
        ctx.beginPath();

        ctx.ellipse(
            0,
            0,
            50,
            40,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // ====================================================
        // MUZZLE
        // ====================================================

        ctx.fillStyle = "rgb(92, 53, 28)";

        ctx.beginPath();

        ctx.ellipse(
            35,
            25,
            30,
            20,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // ====================================================
        // NOSE
        // ====================================================

        ctx.fillStyle = "rgb(36, 21, 13)";

        ctx.beginPath();

        ctx.ellipse(
            60,
            25,
            12,
            9,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // ====================================================
        // EYES
        // ====================================================

        ctx.fillStyle = "black";

        ctx.beginPath();

        ctx.ellipse(
            -15,
            0,
            6,
            6,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.beginPath();

        ctx.ellipse(
            15,
            0,
            6,
            6,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // ====================================================
        // EARS
        // ====================================================

        ctx.fillStyle = "rgb(117, 69, 31)";

        ctx.beginPath();

        ctx.ellipse(
            -35,
            -35,
            22,
            13,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.beginPath();

        ctx.ellipse(
            35,
            -35,
            22,
            13,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // ====================================================
        // ANTLERS
        // ====================================================

        ctx.strokeStyle = "rgb(216, 185, 138)";
        ctx.lineWidth = 10;
        ctx.lineCap = "round";

        ctx.beginPath();

        ctx.moveTo(-25, -35);
        ctx.lineTo(-45, -80);

        ctx.moveTo(-45, -65);
        ctx.lineTo(-65, -75);

        ctx.moveTo(-45, -65);
        ctx.lineTo(-35, -85);

        ctx.moveTo(25, -35);
        ctx.lineTo(45, -80);

        ctx.moveTo(45, -65);
        ctx.lineTo(35, -85);

        ctx.moveTo(45, -65);
        ctx.lineTo(65, -75);

        ctx.stroke();


        // ====================================================
        // MOUTH
        // ====================================================

        if (state.speaking) {
            ctx.fillStyle = "rgb(59, 31, 23)";

            ctx.beginPath();

            ctx.ellipse(
                35,
                45,
                7,
                5,
                0,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        ctx.restore();


        // ====================================================
        // SLEEPING
        // ====================================================

        if (state.napping) {
            ctx.fillStyle = "#6d28d9";
            ctx.font = "bold 28px sans-serif";
            ctx.fillText("zZ", 315, 55);
        }

        ctx.restore();
    }


    // ========================================================
    // ROUNDED RECTANGLE
    // ========================================================

    function drawRoundedRect(
        ctx,
        x,
        y,
        width,
        height,
        radius
    ) {
        ctx.beginPath();

        ctx.roundRect(
            x,
            y,
            width,
            height,
            radius
        );

        ctx.fill();
    }


    return {
        update() {
            drawMoose(getAIState());
        },

        destroy() {
            wrapper.remove();
        }
    };
}
