import Popup from "../PopupWidget/index.js";
import Table from "../TableWidget/index.js";
import Header from "../HeaderWidget/index.js";

/**
 * @class Login
 * @classdesc класс, который реализует авторизацию пользователя через telegram
 */
export default class Login {
  /**
   * @constructor
   */
  constructor() {
    this.phone = "";
    this.phone_code_hash = "";
    this.code = "";
    this.password = "";

    document.querySelector(".spinner_large").classList.add("hide");

    let mainElement = document.querySelector("main");
    let oldLogin = document.querySelector(".login-wrapper");

    if (oldLogin) {
      mainElement.removeChild(oldLogin);
    }
    mainElement.insertAdjacentHTML(
      "afterbegin",
      /* html */ `
          <div class="login-wrapper">
            <div class="login">
              <h3>Вы не авторизованы, войдите в ваш telegram-аккаунт</h3>
              <p class="login-label">Введите ваш номер телефона:</p>
              <p class="input-error hide">
                Неверный номер телефона
              </p>
              <div class="login-form">
                <input type="tel" class="login-input" placeholder="Номер телефона" />
                <button class="login-button">Войти</button>
              </div>
            </div>
          </div>
        `
    );

    this.formElement = document.querySelector(".login .login-form");
    this.inputLabel = document.querySelector(".login-label");
    this.inputError = document.querySelector(".input-error");
    this.loginButton = document.querySelector(".login-button");
    this.inputElement = document.querySelector(".login-input");
  }

  /**
   * @method init
   * @description метод, который добавляет слушатели событий на нажатия на клавиатуру и на клики
   */
  init = () => {
    this.loginButton.addEventListener("click", this.loginPhone);
    document.addEventListener("keydown", this.click);
  };

  /**
   * @method click
   * @description метод, который производит клик по кнопке this.loginButton 
   * @param {Event} event объект события javascript
   */
  click = (event) => {
    if (event.code === "Enter") this.loginButton.click();
  };

  /**
   * @method loginPhone
   * @description метод, который обрабатывает данные из поля ввода, проверяет на корректность и при успешно пройденной проверке переходит на другой этап авторизации
   */
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
    console.log(response)
    // const response = {success: true, phone_code_hash: 123}

    if (response.success) {
      this.phone_code_hash = response.phone_code_hash;
      this.phone = this.inputElement.value;

      this.loginButton.removeEventListener("click", this.loginPhone);
      this.loginButton.addEventListener("click", this.loginCode);

      this.changeFormLabels("code");
      this.loginButton.disabled = false;
      this.loginButton.textContent = "Войти";
    } else {
      this.inputError.textContent =
        "Неверный пароль";
      this.authUnOkPopup();
      this.changeErrorLabel(true);
      this.loginButton.disabled = false;
      this.loginButton.textContent = "Войти";
    }
  };
  /**
    * @method loginCode
    * @description метод, который обрабатывает данные из поля ввода, проверяет на корректность и при успешно пройденной проверке переходит на другой этап авторизации
  */
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
      this.loginButton.textContent = "Войти";
    } else {
      this.changeErrorLabel(true);
      this.loginButton.disabled = false;
      this.loginButton.textContent = "Войти";
    }
  };

  /**
    * @method loginPassword
    * @description метод, который обрабатывает данные из поля ввода, проверяет на корректность и при успешно пройденной проверке завершает авторизацию
   */
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
      this.loginButton.textContent = "Войти";
    } else {
      console.error("error");
      this.log();
      this.changeErrorLabel(true);
      this.loginButton.disabled = false;
      this.loginButton.textContent = "Войти";
    }
  };

  /**
   * @method log
   * @description метод, который логирует данные
   */
  log = () => {
    console.debug("number: ", this.phone);
    console.debug("phone_code_hash: ", this.phone_code_hash);
    console.debug("code: ", this.code);
    console.debug("password: ", this.password);
  };

  /**
   * @method lostFocus
   * @description метод, который переносит фокус с кнопки на поле ввода
   */
  lostFocus = () => {
    this.loginButton.blur();
    this.inputElement.focus();
  };

  /**
   * @method authDonePopup
   * @description метод, который открывает попап с уведомлением об успешной авторизации
   */
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

  /**
   * @method authUnOkPopup
   * @description метод, который открывает попап с уведомлением об не успешной авторизации
   */
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

  /**
   * @method changeErrorLabel
   * @description метод, который скрывает/показывает уведомления об ошибке
   * @param {Boolean} isError 
   */
  changeErrorLabel = (isError) => {
    if (isError) {
      this.inputElement.classList.add("error");
      this.inputError.classList.remove("hide");
    } else {
      this.inputElement.classList.remove("error");
      this.inputError.classList.add("hide");
    }
  };

  /**
   * @method changeFormLabels
   * @description метод, который меняет надписи в форме в зависимости от переданного парамета type
   * @param {String} type тип поля ввода
   */
  changeFormLabels = (type) => {
    this.changeErrorLabel(false);
    if (type === "text") {
      this.inputError.textContent =
        "Неверный номер телефона";
      document.querySelector(".login-label").textContent =
        "Введите номер телефона";
      this.inputElement.value = "";
      this.inputElement.type = "text";
      this.inputElement.placeholder = "Номер телефона";
    } else if (type === "code") {
      this.inputError.textContent =
        "Неверный код подтверждения";
      document.querySelector(".login-label").textContent =
        "Введите код подтверждения";
      this.inputElement.value = "";
      this.inputElement.type = "number";
      this.inputElement.placeholder = "Код подтверждения";
    } else if (type === "password") {
      this.inputError.textContent =
        "";
      document.querySelector(".login-label").textContent = "Введите пароль";
      this.inputElement.value = "";
      this.inputElement.type = "password";
      this.inputElement.placeholder = "Пароль";
    }
  };
}
