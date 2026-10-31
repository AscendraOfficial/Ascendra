"use strict";

const canvas = document.getElementById("shopStall");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

// ===================================
// HELPER: Rounded rectangle
// ===================================

function roundedRect(x, y, w, h, r, color) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
}

// ===================================
// DRAW FOX SHOPKEEPER
// ===================================

function drawFox() {

    // Fox body
    ctx.fillStyle = "#E87932";
    ctx.beginPath();
    ctx.ellipse(400, 440, 100, 115, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cream chest
    ctx.fillStyle = "#FFF0DF";
    ctx.beginPath();
    ctx.ellipse(400, 445, 55, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = "#D96C2B";

    ctx.beginPath();
    ctx.moveTo(350, 270);
    ctx.lineTo(335, 175);
    ctx.lineTo(395, 245);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(405, 245);
    ctx.lineTo(465, 175);
    ctx.lineTo(450, 270);
    ctx.closePath();
    ctx.fill();

    // Inner ears
    ctx.fillStyle = "#F5B6A0";

    ctx.beginPath();
    ctx.moveTo(354, 245);
    ctx.lineTo(346, 197);
    ctx.lineTo(382, 243);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(418, 243);
    ctx.lineTo(454, 197);
    ctx.lineTo(446, 245);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = "#E87932";
    ctx.beginPath();
    ctx.ellipse(400, 300, 75, 82, 0, 0, Math.PI * 2);
    ctx.fill();

    // Forehead marking
    ctx.fillStyle = "#FFF0DF";
    ctx.beginPath();
    ctx.moveTo(389, 225);
    ctx.quadraticCurveTo(400, 218, 411, 225);
    ctx.lineTo(410, 310);
    ctx.lineTo(400, 325);
    ctx.lineTo(390, 310);
    ctx.closePath();
    ctx.fill();

    // Muzzle
    ctx.fillStyle = "#FFF0DF";
    ctx.beginPath();
    ctx.ellipse(400, 330, 57, 39, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#38242A";

    ctx.beginPath();
    ctx.ellipse(370, 290, 7, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(430, 290, 7, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlights
    ctx.fillStyle = "#FFFFFF";

    ctx.beginPath();
    ctx.arc(372, 286, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(432, 286, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = "#38242A";
    ctx.beginPath();
    ctx.moveTo(391, 322);
    ctx.quadraticCurveTo(400, 313, 409, 322);
    ctx.quadraticCurveTo(400, 336, 391, 322);
    ctx.fill();

    // Smile
    ctx.strokeStyle = "#68413A";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(400, 334);
    ctx.quadraticCurveTo(390, 350, 379, 340);

    ctx.moveTo(400, 334);
    ctx.quadraticCurveTo(410, 350, 421, 340);
    ctx.stroke();

    // Blush
    ctx.fillStyle = "rgba(244, 161, 161, 0.65)";

    ctx.beginPath();
    ctx.ellipse(350, 325, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(450, 325, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
}

// ===================================
// BACKGROUND
// ===================================

ctx.fillStyle = "#f0f2f6";
ctx.fillRect(0, 0, 800, 600);

// Ground shadow
ctx.beginPath();
ctx.ellipse(400, 555, 290, 25, 0, 0, Math.PI * 2);
ctx.fillStyle = "rgba(0,0,0,0.12)";
ctx.fill();

// ===================================
// STALL STRUCTURE
// ===================================

// Stall poles
ctx.fillStyle = "#6941a5";
ctx.fillRect(190, 180, 18, 340);
ctx.fillRect(592, 180, 18, 340);

// ===================================
// CANOPY
// ===================================

const roofGradient = ctx.createLinearGradient(160, 0, 640, 0);
roofGradient.addColorStop(0, "#2196f3");
roofGradient.addColorStop(1, "#7f00ff");

roundedRect(160, 130, 480, 100, 12, roofGradient);

// Canopy stripes
for (let i = 0; i < 6; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(160 + i * 80, 135, 40, 90);
}

// Canopy scallops
for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(200 + i * 80, 230, 40, 0, Math.PI);
    ctx.fillStyle = i % 2 === 0 ? "#2196f3" : "#7f00ff";
    ctx.fill();
}

// Shop name
ctx.fillStyle = "#ffffff";
ctx.font = "bold 34px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.shadowColor = "rgba(0,0,0,0.2)";
ctx.shadowBlur = 4;
ctx.fillText("ASCENDRA SHOP", 400, 180);
ctx.shadowBlur = 0;

// ===================================
// FOX SHOPKEEPER
// ===================================

drawFox();

// ===================================
// FINISHING DETAILS
// ===================================

// Small decorative stars
ctx.fillStyle = "#7f00ff";
ctx.font = "24px Arial";
ctx.textAlign = "center";

ctx.fillText("✦", 275, 390);
ctx.fillText("✦", 525, 390);
