import Popup from "../PopupWidget/index.js";
import Table from "../TableWidget/index.js";
import Header from "../HeaderWidget/index.js";

export default class Login {
  constructor() {
    this.phone = "";
    this.phone_code_hash = "";
    this.code = "";
    this.password = "";

    document.querySelector("main").insertAdjacentHTML(
      "afterbegin",
      /* html */ `
        <div class="login">
          <h3>Вы не авторизованы, войдите в ваш telegram-аккаунт</h3>
          <p class="login-label">Введите ваш номер телефона:</p>
          <div class="login-form">
            <p class="input-error hide">
              Неверный номер телефона
            </p>
            <input type="tel" class="login-input" placeholder="Номер телефона" />
            <button class="login-button">Войти</button>
          </div>
        </div>
      `
    );

    this.formElement = document.querySelector(".login .login-form");
    this.inputLabel = document.querySelector(".login-label");
    this.inputError = document.querySelector("p.input-error");
    this.loginButton = document.querySelector(".login-button");
    this.inputElement = document.querySelector(".login-input");
  }

  init = () => {
    this.loginButton.addEventListener("click", this.loginPhone);
    document.addEventListener("keydown", this.click);
  };

  click = (event) => {
    if (event.code === "Enter") this.loginButton.click();
  };

  loginPhone = async () => {
    this.lostFocus();
    this.loginButton.disabled = true;
    this.loginButton.innerHTML = `
      <div class="spinner">
        <div class="block"></div>
      </div>
    `;

    let phone = this.inputElement.value;

    const response = await eel.login_phone(phone)();
    // const response = {success: true, phone_code_hash: 123}

    if (response.success) {
      this.phone_code_hash = response.phone_code_hash;
      this.phone = this.inputElement.value;

      this.loginButton.removeEventListener("click", this.loginPhone);
      this.loginButton.addEventListener("click", this.loginCode);

      this.changeFormLabels("code");
      this.loginButton.disabled = false;
      this.loginButton.textContent = "Войти"
    } else {
      this.authUnOkPopup();
      this.changeErrorLabel(true);
      this.loginButton.disabled = false;
      this.loginButton.textContent = "Войти"
    }
  };

  loginCode = async () => {
    this.loginButton.disabled = true;
    this.loginButton.innerHTML = `
      <div class="spinner">
        <div class="block"></div>
      </div>
    `;
    this.lostFocus();
    let phone = this.phone;
    let code = this.inputElement.value;

    const response = await eel.login_code(phone, code)();
    // const response = {success: true, phone_code_hash: 123, need_password: true}

    if (response.success) {
      if (response.need_password) {
        this.phone_code_hash = response.phone_code_hash;
        this.code = code;
        this.phone = this.inputElement.value;

        this.loginButton.removeEventListener("click", this.loginPhone);
        this.loginButton.addEventListener("click", this.loginPassword);

        this.changeFormLabels("password");
      } else {
        localStorage.setItem("userInfo", JSON.stringify(response.user));

        this.authDonePopup();
      }

      this.loginButton.disabled = false;
      this.loginButton.textContent = "Войти"
    } else {
      this.changeErrorLabel(true);
      this.loginButton.disabled = false;
      this.loginButton.textContent = "Войти"
    }
  };

  loginPassword = async () => {
    this.loginButton.disabled = true;
    this.loginButton.innerHTML = `
      <div class="spinner">
        <div class="block"></div>
      </div>
    `;
    let password = this.inputElement.value;
    let phone = this.phone;
    let phone_code_hash = this.phone_code_hash;

    const response = await eel.login_password(
      phone,
      password,
      phone_code_hash
    )();
    // const response = {success: true, user: {username: '123123'}}

    if (response.success) {
      this.changeErrorLabel(false);

      localStorage.setItem("userInfo", JSON.stringify(response.user));

      this.loginButton.removeEventListener("click", this.loginPassword);
      document.removeEventListener("keydown", this.click);

      document.querySelector(".login").classList.add("hide");
      document
        .querySelector(".table-container.main-table")
        .classList.remove("hide");

      new Header(response.user).changeAvatar(response.picture);
      new Table().getData();

      this.authDonePopup();
      this.loginButton.disabled = false;
      this.loginButton.textContent = "Войти"
    } else {
      console.error("error");
      this._log();
      this.changeErrorLabel(true);
      this.loginButton.disabled = false;
      this.loginButton.textContent = "Войти"
    }
  };

  _log = () => {
    console.debug("number: ", this.phone);
    console.debug("phone_code_hash: ", this.phone_code_hash);
    console.debug("code: ", this.code);
    console.debug("password: ", this.password);
  };

  lostFocus = () => {
    this.loginButton.blur();
    this.inputElement.focus();
  };

  authDonePopup = () => {
    const popup = new Popup(`
<div class='popup-content'>
  <h2>Вы успешно авторизовались</h2>
  <div class='buttons'>
    <button id='popup-done'>ОК</button>
  </div>
</div>
`);

    popup.show();

    function addFolderHandler() {
      popup.close();
    }

    document
      .getElementById("popup-done")
      .addEventListener("click", addFolderHandler, {
        once: true,
      });
  };

  authUnOkPopup = () => {
    const popup = new Popup(`
<div class='popup-content'>
  <h2>Произошла ошибка</h2>
  <p>Попробуйте еще раз ввести номер телефона или попробуйте войти позже</p>
  <div class='buttons'>
    <button id='popup-done'>ОК</button>
  </div>
</div>
`);

    popup.show();

    function addFolderHandler() {
      popup.close();
    }

    document
      .getElementById("popup-done")
      .addEventListener("click", addFolderHandler, {
        once: true,
      });
  };

  changeErrorLabel = (isError) => {
    if (isError) {
      this.inputElement.classList.add("error");
      this.inputError.classList.remove("hide");
    } else {
      this.inputElement.classList.remove("error");
      this.inputError.classList.add("hide");
    }
  };

  changeFormLabels = (type) => {
    this.changeErrorLabel(false);
    if (type === "text") {
      this.formElement.querySelector("p.input-error").textContent =
        "Неверный номер телефона";
      document.querySelector(".login-label").textContent =
        "Введите номер телефона";
      this.inputElement.value = "";
      this.inputElement.type = "text";
      this.inputElement.placeholder = "Номер телефона";
    } else if (type === "code") {
      this.formElement.querySelector("p.input-error").textContent =
        "Неверный код подтверждения";
      document.querySelector(".login-label").textContent =
        "Введите код подтверждения";
      this.inputElement.value = "";
      this.inputElement.type = "number";
      this.inputElement.placeholder = "Код подтверждения";
    } else if (type === "password") {
      this.formElement.querySelector("p.input-error").textContent =
        "Неверный пароль";
      document.querySelector(".login-label").textContent = "Введите пароль";
      this.inputElement.value = "";
      this.inputElement.type = "password";
      this.inputElement.placeholder = "Пароль";
    }
  };
}
