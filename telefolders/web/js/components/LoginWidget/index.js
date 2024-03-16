import Popup from "../PopupWidget/index.js";
import Table from "../TableWidget/index.js";
import Header from "../HeaderWidget/index.js";

export default class Login {
  constructor() {
    this.phone = "";
    this.phone_code_hash = "";
    this.code = "";
    this.password = "";

    this.formElement = document.querySelector(".login .login-form");
    this.inputLabel = document.querySelector(".login-label");
    this.inputError = this.formElement.querySelector("p.input-error");
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
    console.log(this.inputElement.value);

    let phone = this.inputElement.value;

    const response = await eel.login_phone(phone)();
    // const response = {success: true, phone_code_hash: 123}

    console.log(response);
    console.log(phone);

    if (response.success) {
      this._log();
      this.phone_code_hash = response.phone_code_hash;
      this.phone = this.inputElement.value;

      this.loginButton.removeEventListener("click", this.loginPhone);
      this.loginButton.addEventListener("click", this.loginCode);

      this.changeFormLabels("code");
    } else {
      this._log();
      this.authUnOkPopup();
      this.changeErrorLabel(true);
    }
  };

  loginCode = async () => {
    this.lostFocus();
    let phone = this.phone;
    let code = this.inputElement.value;

    console.log(phone, code);

    const response = await eel.login_code(phone, code)();
    // const response = {success: true, phone_code_hash: 123, need_password: true}

    if (response.success) {
      this._log();
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
    } else {
      this._log();
      this.changeErrorLabel(true);
    }
  };

  loginPassword = async () => {
    this.lostFocus();
    let password = this.inputElement.value;
    let phone = this.phone;
    let phone_code_hash = this.phone_code_hash;

    console.log(phone, password, phone_code_hash);

    const response = await eel.login_password(
      phone,
      password,
      phone_code_hash,
    )();
    // const response = {success: true, user: {username: '123123'}}

    if (response.success) {
      this._log();
      localStorage.setItem("userInfo", JSON.stringify(response.user));

      this.loginButton.removeEventListener("click", this.loginPassword);
      document.removeEventListener("keydown", this.click);

      document.querySelector(".login").classList.add("hide");
      document.querySelector(".table-container").classList.remove("hide");

      new Header(response.user).changeAvatar(response.picture);
      new Table().getData();

      this.authDonePopup();
    } else {
      console.error("error");
      this._log();
      this.changeErrorLabel(true);
    }
  };

  _log = () => {
    console.log("number: ", this.phone);
    console.log("phone_code_hash: ", this.phone_code_hash);
    console.log("code: ", this.code);
    console.log("password: ", this.password);
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
      .addEventListener("click", addFolderHandler, { once: true });
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
      .addEventListener("click", addFolderHandler, { once: true });
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
