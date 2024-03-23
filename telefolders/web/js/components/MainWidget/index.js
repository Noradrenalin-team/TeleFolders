import Table from "../TableWidget/index.js";
import Login from "../LoginWidget/index.js";
import Header from "../HeaderWidget/index.js";

export default class Main {
  async init() {
    let response = await eel.init()();

    response = await eel.get_user()();

    if (response === null) {
      document.querySelector(".spinner_large").classList.add("hide");
      const login = new Login()
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
