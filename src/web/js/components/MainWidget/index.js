import Table from "../TableWidget/index.js";
import Login from "../LoginWidget/index.js";
import Header from "../HeaderWidget/index.js";

export default class Main {
  async init() {
    const response = await eel.get_user()();
  
    if (response === null) {
      new Login().init()
      document.querySelector(".login").classList.remove("hide");
      return;
    }
    
    const header = new Header(response)
    header.init()
    
    new Table()
    
    document.querySelector(".login").classList.add("hide");
    document.querySelector(".table-container").classList.remove("hide");
    
    header.changeAvatar(response.picture)
  }
}