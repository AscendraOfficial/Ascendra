document.addEventListener("DOMContentLoaded", function () {

    /* ================================
       PROFILE ELEMENTS
    ================================ */

    const nameInput =
        document.getElementById("name-input");

    const surnameInput =
        document.getElementById("surname-input");

    const usernameInput =
        document.getElementById("username-input");

    const bioInput =
        document.getElementById("bio-input");

    const displayName =
        document.getElementById("display-name");

    const displayUsername =
        document.getElementById("display-username");

    const displayBio =
        document.getElementById("display-bio");

    const saveButton =
        document.getElementById("save-button");

    const saveMessage =
        document.getElementById("save-message");

    const profileUpload =
        document.getElementById("profile-upload");

    const profilePicture =
        document.getElementById("profile-picture");

    const characterCount =
        document.getElementById("character-count");

    const streakNumber =
        document.getElementById("streak-number");

    const tasksNumber =
        document.getElementById("tasks-number");

    const achievementsNumber =
        document.getElementById("achievements-number");


    /* ================================
       PASSWORD ELEMENTS
    ================================ */

    const passwordUsername =
        document.getElementById("password-username");

    const sendCodeButton =
        document.getElementById("send-code-button");

    const verificationSection =
        document.getElementById("verification-section");

    const verificationCode =
        document.getElementById("verification-code");

    const verifyCodeButton =
        document.getElementById("verify-code-button");

    const newPasswordSection =
        document.getElementById("new-password-section");

    const newPassword =
        document.getElementById("new-password");

    const confirmPassword =
        document.getElementById("confirm-password");

    const changePasswordButton =
        document.getElementById("change-password-button");

    const passwordMessage =
        document.getElementById("password-message");


    /* ================================
       PASSWORD RECOVERY STATE
    ================================ */

    let recoveryUsername = "";
    let recoveryCode = "";
    let codeCreated = 0;
    let verificationAttempts = 0;
    let verified = false;


    /* ================================
       PROFILE HELPERS
    ================================ */

    function cleanUsername(username) {

        return username
            .trim()
            .replace(/@/g, "")
            .replace(/\s+/g, "");
    }


    function showMessage(message, type) {

        saveMessage.textContent = message;

        if (type === "success") {
            saveMessage.className = "success-message";
        } else {
            saveMessage.className = "error-message";
        }

        setTimeout(function () {

            saveMessage.textContent = "";
            saveMessage.className = "";

        }, 3000);
    }


    /* ================================
       LOAD PROFILE
    ================================ */

    function loadProfile() {

        const savedName =
            localStorage.getItem("name") ||
            "Ascendra";

        const savedSurname =
            localStorage.getItem("surname") ||
            "User";

        const savedUsername =
            localStorage.getItem("username") ||
            "ascendrauser";

        const savedBio =
            localStorage.getItem("ascendra-profile-bio") ||
            "Becoming better, one day at a time.";

        const savedPicture =
            localStorage.getItem(
                "ascendra-profile-picture"
            );


        nameInput.value = savedName;

        surnameInput.value = savedSurname;

        usernameInput.value = savedUsername;

        bioInput.value = savedBio;


        displayName.textContent =
            savedName + " " + savedSurname;

        displayUsername.textContent =
            "@" + savedUsername;

        displayBio.textContent =
            savedBio;


        characterCount.textContent =
            savedBio.length + " / 120";


        streakNumber.textContent =
            localStorage.getItem(
                "ascendra-streak"
            ) || "0";


        tasksNumber.textContent =
            localStorage.getItem(
                "ascendra-tasks-completed"
            ) || "0";


        achievementsNumber.textContent =
            localStorage.getItem(
                "ascendra-achievements"
            ) || "0";


        if (savedPicture) {

            profilePicture.src =
                savedPicture;

        }
    }


    /* ================================
       SAVE PROFILE
    ================================ */

    saveButton.addEventListener(
        "click",
        function () {

            const name =
                nameInput.value.trim();

            const surname =
                surnameInput.value.trim();

            const username =
                cleanUsername(
                    usernameInput.value
                );

            const bio =
                bioInput.value.trim();


            if (name === "") {

                showMessage(
                    "Please enter your first name.",
                    "error"
                );

                return;
            }


            if (surname === "") {

                showMessage(
                    "Please enter your surname.",
                    "error"
                );

                return;
            }


            if (username === "") {

                showMessage(
                    "Please enter a username.",
                    "error"
                );

                return;
            }


            const oldUsername =
                localStorage.getItem("username");


            let savedPassword = "";
            let savedPasswordSalt = "";


            /*
             * Preserve the existing password
             * when the username is changed.
             */

            if (oldUsername) {

                const oldUserData =
                    localStorage.getItem(
                        oldUsername
                    );


                if (oldUserData) {

                    try {

                        const oldUser =
                            JSON.parse(
                                oldUserData
                            );


                        savedPassword =
                            oldUser.password || "";


                        savedPasswordSalt =
                            oldUser.passwordSalt || "";

                    } catch (error) {

                        console.error(
                            "Could not read saved user:",
                            error
                        );

                    }
                }
            }


            const updatedUser = {

                name: name,

                surname: surname,

                username: username,

                password: savedPassword,

                passwordSalt:
                    savedPasswordSalt

            };


            localStorage.setItem(
                "name",
                name
            );


            localStorage.setItem(
                "surname",
                surname
            );


            localStorage.setItem(
                "username",
                username
            );


            localStorage.setItem(
                "ascendra-profile-bio",
                bio
            );


            localStorage.setItem(
                username,
                JSON.stringify(updatedUser)
            );


            if (
                oldUsername &&
                oldUsername !== username
            ) {

                localStorage.removeItem(
                    oldUsername
                );

            }


            displayName.textContent =
                name + " " + surname;


            displayUsername.textContent =
                "@" + username;


            displayBio.textContent =
                bio ||
                "Becoming better, one day at a time.";


            usernameInput.value =
                username;


            showMessage(
                "Profile saved successfully!",
                "success"
            );

        }
    );


    /* ================================
       BIO CHARACTER COUNT
    ================================ */

    bioInput.addEventListener(
        "input",
        function () {

            characterCount.textContent =
                bioInput.value.length +
                " / 120";

        }
    );


    /* ================================
       PROFILE PICTURE
    ================================ */

    profileUpload.addEventListener(
        "change",
        function (event) {

            const selectedFile =
                event.target.files[0];


            if (!selectedFile) {
                return;
            }


            if (
                !selectedFile.type.startsWith(
                    "image/"
                )
            ) {

                showMessage(
                    "Please choose an image file.",
                    "error"
                );

                profileUpload.value = "";

                return;
            }


            const reader =
                new FileReader();


            reader.addEventListener(
                "load",
                function () {

                    profilePicture.src =
                        reader.result;


                    try {

                        localStorage.setItem(
                            "ascendra-profile-picture",
                            reader.result
                        );


                        showMessage(
                            "Profile picture updated!",
                            "success"
                        );

                    } catch (error) {

                        showMessage(
                            "That image is too large.",
                            "error"
                        );

                    }

                }
            );


            reader.readAsDataURL(
                selectedFile
            );

        }
    );


    /* ================================
       PASSWORD MESSAGE
    ================================ */

    function passwordMessageShow(
        message,
        type
    ) {

        passwordMessage.textContent =
            message;


        if (type === "success") {

            passwordMessage.className =
                "success-message";

        } else {

            passwordMessage.className =
                "error-message";

        }

    }


    /* ================================
       GENERATE SECURE CODE
    ================================ */

    function generateVerificationCode() {

        const array =
            new Uint32Array(1);


        crypto.getRandomValues(
            array
        );


        return String(
            array[0] % 1000000
        ).padStart(6, "0");

    }


    /* ================================
       HASH PASSWORD
    ================================ */

    async function hashPassword(
        password,
        salt
    ) {

        const encoder =
            new TextEncoder();


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


        return Array.from(
            new Uint8Array(bits)
        )
        .map(function (byte) {

            return byte
                .toString(16)
                .padStart(2, "0");

        })
        .join("");

    }


    /* ================================
       SEND VERIFICATION CODE
    ================================ */

    sendCodeButton.addEventListener(
        "click",
        function () {

            const username =
                cleanUsername(
                    passwordUsername.value
                );


            if (!username) {

                passwordMessageShow(
                    "Please enter your username.",
                    "error"
                );

                return;
            }


            const account =
                localStorage.getItem(
                    username
                );


            if (!account) {

                passwordMessageShow(
                    "No account was found with that username.",
                    "error"
                );

                return;
            }


            recoveryUsername =
                username;


            recoveryCode =
                generateVerificationCode();


            codeCreated =
                Date.now();


            verificationAttempts = 0;

            verified = false;


            verificationCode.value = "";


            newPassword.value = "";

            confirmPassword.value = "";


            verificationSection.hidden =
                false;


            newPasswordSection.hidden =
                true;


            /*
             * IMPORTANT:
             *
             * Browser-only version.
             *
             * This does NOT send a real email.
             *
             * The code is displayed locally
             * for testing.
             */

            passwordMessageShow(
                "Verification code: " +
                recoveryCode,
                "success"
            );


            console.log(
                "Ascendra verification code:",
                recoveryCode
            );

        }
    );


    /* ================================
       VERIFY CODE
    ================================ */

    verifyCodeButton.addEventListener(
        "click",
        function () {

            if (!recoveryCode) {

                passwordMessageShow(
                    "Please request a verification code first.",
                    "error"
                );

                return;
            }


            /*
             * Codes expire after 10 minutes.
             */

            if (
                Date.now() - codeCreated >
                10 * 60 * 1000
            ) {

                recoveryCode = "";

                passwordMessageShow(
                    "Your verification code has expired. Please request a new one.",
                    "error"
                );

                return;
            }


            /*
             * Maximum 5 attempts.
             */

            if (
                verificationAttempts >= 5
            ) {

                recoveryCode = "";

                passwordMessageShow(
                    "Too many incorrect attempts. Please request a new code.",
                    "error"
                );

                return;
            }


            const enteredCode =
                verificationCode.value.trim();


            if (
                enteredCode !==
                recoveryCode
            ) {

                verificationAttempts++;


                passwordMessageShow(
                    "Incorrect verification code.",
                    "error"
                );

                return;
            }


            /*
             * Verification successful.
             */

            verified = true;

            recoveryCode = "";


            verificationSection.hidden =
                true;


            newPasswordSection.hidden =
                false;


            passwordMessageShow(
                "Account verified. You can now create a new password.",
                "success"
            );

        }
    );


    /* ================================
       CHANGE PASSWORD
    ================================ */

    changePasswordButton.addEventListener(
        "click",
        async function () {

            if (
                !verified ||
                !recoveryUsername
            ) {

                passwordMessageShow(
                    "Please verify your account first.",
                    "error"
                );

                return;
            }


            const password =
                newPassword.value;


            const confirmation =
                confirmPassword.value;


            /*
             * Minimum password length.
             */

            if (
                password.length < 8
            ) {

                passwordMessageShow(
                    "Your password must be at least 8 characters.",
                    "error"
                );

                return;
            }


            /*
             * Require a stronger password.
             */

            if (
                !/[A-Z]/.test(password) ||
                !/[a-z]/.test(password) ||
                !/[0-9]/.test(password)
            ) {

                passwordMessageShow(
                    "Use at least one uppercase letter, one lowercase letter, and one number.",
                    "error"
                );

                return;
            }


            if (
                password !==
                confirmation
            ) {

                passwordMessageShow(
                    "The passwords do not match.",
                    "error"
                );

                return;
            }


            const accountData =
                localStorage.getItem(
                    recoveryUsername
                );


            if (!accountData) {

                passwordMessageShow(
                    "Account could not be found.",
                    "error"
                );

                return;
            }


            let account;


            try {

                account =
                    JSON.parse(
                        accountData
                    );

            } catch (error) {

                passwordMessageShow(
                    "Account data could not be read.",
                    "error"
                );

                return;
            }


            /*
             * Generate a unique random salt.
             */

            const salt =
                crypto.getRandomValues(
                    new Uint8Array(16)
                );


            /*
             * Hash the password using
             * PBKDF2 + SHA-256.
             */

            const hashedPassword =
                await hashPassword(
                    password,
                    salt
                );


            /*
             * Convert salt to hexadecimal.
             */

            const saltString =
                Array.from(salt)
                    .map(function (byte) {

                        return byte
                            .toString(16)
                            .padStart(2, "0");

                    })
                    .join("");


            /*
             * Save only the hash and salt.
             * The actual password is NOT stored.
             */

            account.password =
                hashedPassword;


            account.passwordSalt =
                saltString;


            localStorage.setItem(
                recoveryUsername,
                JSON.stringify(account)
            );


            /*
             * Reset recovery state.
             */

            newPassword.value = "";

            confirmPassword.value = "";

            passwordUsername.value = "";

            verificationCode.value = "";


            verified = false;

            recoveryUsername = "";

            recoveryCode = "";

            verificationAttempts = 0;


            newPasswordSection.hidden =
                true;


            verificationSection.hidden =
                true;


            passwordMessageShow(
                "Password changed successfully!",
                "success"
            );

        }
    );


    /* ================================
       SHOW / HIDE PASSWORD
    ================================ */

    document
        .querySelectorAll(".password-toggle")
        .forEach(function (toggle) {

            toggle.addEventListener(
                "click",
                function () {

                    const target =
                        document.getElementById(
                            toggle.dataset.target
                        );


                    const icon =
                        toggle.querySelector("i");


                    if (
                        target.type ===
                        "password"
                    ) {

                        target.type =
                            "text";


                        icon.classList.remove(
                            "fa-eye"
                        );


                        icon.classList.add(
                            "fa-eye-slash"
                        );


                        toggle.setAttribute(
                            "aria-label",
                            "Hide password"
                        );

                    } else {

                        target.type =
                            "password";


                        icon.classList.remove(
                            "fa-eye-slash"
                        );


                        icon.classList.add(
                            "fa-eye"
                        );


                        toggle.setAttribute(
                            "aria-label",
                            "Show password"
                        );

                    }

                }
            );

        });


    /* ================================
       START
    ================================ */

    loadProfile();

});
