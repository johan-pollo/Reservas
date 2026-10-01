const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const loginMessage = document.getElementById("loginMessage");

const togglePassword = document.getElementById("togglePassword");


togglePassword.addEventListener("click", function () {

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.textContent = "🙈";
        togglePassword.setAttribute("aria-label", "Ocultar contraseña");
    } else {
        passwordInput.type = "password";
        togglePassword.textContent = "👁";
        togglePassword.setAttribute("aria-label", "Mostrar contraseña");
    }

});


loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    emailError.textContent = "";
    passwordError.textContent = "";
    loginMessage.textContent = "";

    loginMessage.className = "login-message";

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    let isValid = true;

    if (email === "") {
        emailError.textContent = "El correo electrónico es obligatorio.";
        isValid = false;
    } else if (!validateEmail(email)) {
        emailError.textContent = "Ingresa un correo electrónico válido.";
        isValid = false;
    }

    if (password === "") {
        passwordError.textContent = "La contraseña es obligatoria.";
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    /*
        Por ahora las credenciales son simuladas.
        Más adelante el backend se encargará
        de validar los usuarios reales.
    */

    const emailDemo = "usuario@correo.com";
    const passwordDemo = "123456";

    if (email === emailDemo && password === passwordDemo) {

        loginMessage.textContent = "Inicio de sesión exitoso.";
        loginMessage.classList.add("success");

    } else {

        loginMessage.textContent = "El correo o la contraseña son incorrectos.";
        loginMessage.classList.add("error");

    }

});


function validateEmail(email) {

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
}
