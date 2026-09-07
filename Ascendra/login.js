const form = document.getElementById("login");

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    const username = usernameInput.value
        .trim()
        .replace(/@/g, "")
        .replace(/\s+/g, "");

    const password = passwordInput.value;

    if (!username || !password) {
        alert("Please enter your username and password.");
        return;
    }

    const userData = localStorage.getItem(username);

    if (!userData) {
        alert("Incorrect username or password.");
        return;
    }

    let user;

    try {
        user = JSON.parse(userData);
    } catch {
        alert("Account data is corrupted.");
        return;
    }

    /* New secure password system */
    if (user.password && user.passwordSalt) {

        const encoder = new TextEncoder();

        const salt = new Uint8Array(
            user.passwordSalt.match(/.{1,2}/g).map(
                byte => parseInt(byte, 16)
            )
        );

        const keyMaterial =
            await crypto.subtle.importKey(
                "raw",
                encoder.encode(password),
                "PBKDF2",
                false,
                ["deriveBits"]
            );

        const bits =
            await crypto.subtle.deriveBits(
                {
                    name: "PBKDF2",
                    salt: salt,
                    iterations: 150000,
                    hash: "SHA-256"
                },
                keyMaterial,
                256
            );

        const hash = Array.from(
            new Uint8Array(bits)
        )
        .map(byte =>
            byte.toString(16).padStart(2, "0")
        )
        .join("");

        if (hash !== user.password) {
            alert("Incorrect username or password.");
            return;
        }

    } else {

        /* Old accounts using plain passwords */
        if (password !== user.password) {
            alert("Incorrect username or password.");
            return;
        }
    }

    /* Remember the logged-in account */
    localStorage.setItem(
        "loggedInUser",
        username
    );

    /* Go to Ascendra */
    window.location.href = "home.html";
});
