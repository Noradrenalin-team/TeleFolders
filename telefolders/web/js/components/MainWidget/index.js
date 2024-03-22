import Table from "../TableWidget/index.js";
import Login from "../LoginWidget/index.js";
import Header from "../HeaderWidget/index.js";

export default class Main {
  async init() {
    let response = await eel.init()();

    console.log(response);

    response = await eel.get_user()();

    if (response === null) {
      new Login().init();
      document.querySelector(".login").classList.remove("hide");
      document.querySelector(".spinner").classList.add("hide");
      return;
    }

    localStorage.setItem("user-id", response.id);

    const header = new Header(response);

    new Table().getData();

    document.querySelector(".login").classList.add("hide");

    header.changeAvatar(response.picture);
  }
}
