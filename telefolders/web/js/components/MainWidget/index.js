import Table from "../TableWidget/index.js";
import Login from "../LoginWidget/index.js";
import Header from "../HeaderWidget/index.js";
import Popup from "../PopupWidget/index.js";

export default class Main {
  async init() {
    let response = await eel.init()();
    console.log('init: ', response)

    if (!response.success) {
      const popupComponent = new Popup(`
        <div class='popup-content'>
          <h2>Ошибка</h2>
          <p>При запуске программы произошла ошибка</p>
          <p>
            <a 
              style="color: blue; text-decoration: underline;"
              href="https://t.me/+4iWgAed_aDYyMWEy"
            >
              Сообщите об ошибке
            </a>
          </p>
          <div class='buttons'>
            <button id='popup-done'>Ок</button>
          </div>
        </div>
      `);

      popupComponent.show();

      function closeHandler() {
        popupComponent.close();
      }

      document
        .getElementById("popup-done")
        .addEventListener("click", closeHandler, {once: true});
    } else {
      response = await eel.get_user()();

      console.log('get_user: ', response)

      if (response === null) {
        document.querySelector(".spinner_large").classList.add("hide");
        const login = new Login();
        login.init();

        document.querySelector(".login").classList.remove("hide");
        document.querySelector(".spinner_large").classList.add("hide");
      } else {
        localStorage.setItem("user-id", response.id);

        const header = new Header(response);

        new Table().getData();

        header.changeAvatar(response.picture);
      }
    }
  }
}
