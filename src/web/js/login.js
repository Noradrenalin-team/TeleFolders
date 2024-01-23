import start from "./main.js";

let phone = "";
let phone_code_hash = "";
let code = "";
let password = "";

async function loginPhone() {
  const formElement = document.querySelector(".login .login-form");
  const inputElement = formElement.querySelector(".login-input");

  document.querySelector(".login-label").textContent = "Введите ваш номер телефона:";
  inputElement.placeholder = "Номер телефона";

  if (inputElement.value.length === 0) {
    inputElement.style.border = "red 1px solid";
    inputElement.style.borderRadius = ".1rem";
  } else {
    inputElement.style.border = "black 1px solid";
    inputElement.style.borderRadius = "1px";

    if (inputElement.value.startsWith("+")) {
      formElement.querySelector("p.input-error").classList.add("hide");

      console.log('phone: ' + inputElement.value)
      const response = await eel.login_phone(inputElement.value)();

      if (response.success) {
        phone_code_hash = response.phone_code_hash;
        phone = inputElement.value;
        formElement.querySelector("p.input-error").textContent =
          "Неверный код подтверждения";
        document.querySelector(".login-label").textContent =
          "Введите код подтверждения";
        inputElement.value = "";
        inputElement.type = "number";
        inputElement.placeholder = "Код подтверждения";
        formElement.querySelector(".login-button").className = "login-button";
        document
          .querySelector(".login-button")
          .removeEventListener("click", loginPhone);
        document
          .querySelector(".login-button")
          .addEventListener("click", loginCode);
      }
    } else {
      formElement.querySelector("p.input-error").classList.remove("hide");
    }
  }
}

async function loginCode() {
  const formElement = document.querySelector(".login .login-form");
  const inputElement = formElement.querySelector(".login-input");

  if (inputElement.value.length === 0) {
    inputElement.style.border = "red 1px solid";
    inputElement.style.borderRadius = ".1rem";
  } else {
    inputElement.style.border = "black 1px solid";
    inputElement.style.borderRadius = "1px";

    formElement.querySelector("p.input-error").classList.add("hide");

    code = inputElement.value;

    console.log('code: ' + code)
    const response = await eel.login_code(phone, code)();

    if (!response.need_password) {
      localStorage.setItem("userInfo", JSON.stringify(response.user));

      alert("auth complete");
    } else {
      formElement.querySelector("p.input-error").textContent =
        "Неверный пароль";

      document.querySelector(".login-label").textContent = "Введите пароль";

      inputElement.value = "";
      inputElement.type = "text";
      inputElement.placeholder = "Пароль";

      formElement.querySelector(".login-button").className = "login-button";

      document
        .querySelector(".login-button")
        .removeEventListener("click", loginCode);
      document
        .querySelector(".login-button")
        .addEventListener("click", loginPassword);
    }
  }
}

async function loginPassword() {
  const formElement = document.querySelector(".login .login-form");
  const inputElement = formElement.querySelector(".login-input");

  if (inputElement.value.length === 0) {
    inputElement.style.border = "red 1px solid";
    inputElement.style.borderRadius = ".1rem";
  } else {
    inputElement.style.border = "black 1px solid";
    inputElement.style.borderRadius = "1px";

    formElement.querySelector("p.input-error").classList.add("hide");

    password = inputElement.value;

    console.log('password: ' + password)

    const response = await eel.login_password(
      phone,
      password,
      phone_code_hash
    )();

    console.log(response);

    if (response.success) {
      localStorage.setItem("userInfo", JSON.stringify(response.user));
      document
        .querySelector(".login-button")
        .removeEventListener("click", loginPassword);

      document.querySelector('.login').classList.add('hide')
      document.querySelector('.table').classList.remove('hide')
      document.querySelector('.header .avatar img').src = response.picture ? response.picture : '../img/folders_type_contacts@3x.png'
      start()
    } else {
      inputElement.value = "";
      formElement.querySelector("p.input-error").classList.remove("hide");
    }
  }
}

export {
  loginPhone,
  loginCode,
  loginPassword,
  password,
  code,
  phone_code_hash,
  phone,
};
