const form = document.getElementById("login");

form.addEventListener("submit", async function(event) {

    event.preventDefault();

    const usernameInput =
        document.getElementById("name");

    const passwordInput =
        document.getElementById("password");

    const username =
        usernameInput.value
            .trim()
            .replace(/@/g, "")
            .replace(/\s+/g, "");

    const password =
        passwordInput.value;


    if (!username || !password) {
        alert("Please enter your username and password.");
        return;
    }


    /* Find the account */

    const userData =
        localStorage.getItem(username);


    if (!userData) {
        alert("Incorrect username or password.");
        return;
    }


    let user;

    try {

        user = JSON.parse(userData);

    } catch {

        alert("Account data could not be read.");
        return;

    }


    /* ================================
       SECURE PASSWORD CHECK
    ================================ */

    if (
        user.password &&
        user.passwordSalt
    ) {

        const encoder =
            new TextEncoder();


        /* Convert saved hexadecimal salt */

        const salt =
            new Uint8Array(
                user.passwordSalt
                    .match(/.{1,2}/g)
                    .map(function(byte) {
                        return parseInt(byte, 16);
                    })
            );


        /* Turn entered password into key material */

        const keyMaterial =
            await crypto.subtle.importKey(
                "raw",
                encoder.encode(password),
                "PBKDF2",
                false,
                ["deriveBits"]
            );


        /* Hash entered password */

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


        const hash =
            Array.from(
                new Uint8Array(bits)
            )
            .map(function(byte) {

                return byte
                    .toString(16)
                    .padStart(2, "0");

            })
            .join("");


        /* Compare hashes */

        if (hash !== user.password) {

            alert(
                "Incorrect username or password."
            );

            return;
        }

    } else {

        /* Compatibility with old accounts */

        if (password !== user.password) {

            alert(
                "Incorrect username or password."
            );

            return;
        }
    }


    /* ================================
       LOGIN SUCCESSFUL
    ================================ */

    localStorage.setItem(
        "loggedInUser",
        username
    );


    window.location.href =
        "home.html";

});
