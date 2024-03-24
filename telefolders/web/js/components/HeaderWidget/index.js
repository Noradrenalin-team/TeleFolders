import Login from "../LoginWidget/index.js";
import Table from "../TableWidget/index.js";

/**
  @class Header
  @classdesc класс, реализующий работу с header`ом
 */
export default class Header {
  /**
   * @constructor
   * @param {Object} data данные об пользователе
   */
  constructor(data) {
    this.data = data;
    this.avatarContainerElement = document.querySelector(".avatar");
    this.userMenuElement = document.querySelector(".user-menu");
    this.init();
    this.table = new Table();
  }

  /**
   * @method init
   * @description метод, создающий слушатели для heder`а
   */
  init = () => {
    this.avatarContainerElement.addEventListener(
      "click",
      this.handleAvatarClick,
    );
    window.addEventListener("click", this.handleWindowClick);
  };


  /**
   * @method changeAvatar
   * @description метод, меняющий аватар
   * @param {String} picture 
   */
  changeAvatar = (picture) => {
    this.avatarContainerElement.querySelector(".header .avatar img").src =
      picture ? picture : "/img/contacts.png";
  };

  /**
   * @method handleAvatarClick
   * @description метод, делегирующий события
   * @param {Event} event объект события javascript
   */
  handleAvatarClick = (event) => {
    event.stopPropagation();

    if (JSON.parse(localStorage.getItem("archiveState"))) {
      const element = this.userMenuElement.querySelector(".hideArchived");
      element.textContent = "Скрыть архивные";
    } else if (JSON.parse(localStorage.getItem("archiveState")) === "false") {
      const element = this.userMenuElement.querySelector(".hideArchived");
      element.textContent = "Показать архивные";
    }

    if (this.userMenuElement.className === "user-menu") {
      this.userMenuElement.classList.add("hide");
    } else if (this.userMenuElement.className === "user-menu hide") {
      this.userMenuElement.classList.remove("hide");
    }

    if (event.target.className === "hideArchived") {
      this.changeText();
    } else if (event.target.className === "reloadChatsList") {
      this.reloadChats();
    } else if (event.target.className === "logout") {
      this.logout(event);
    } else if (event.target.className === "user-menu") {
    } else if (event.target.alt === "avatar") return;

    this.userMenuElement.querySelector(".username").textContent =
      "@" + this.data.username;
  };

  /**
   * @method handleWindowClick
   * @description метод, отслеживающий клики вне "userMenuElement"
   * @param {Event} event объект события javascript
   */
  handleWindowClick = (event) => {
    if (
      event.target !== this.avatarContainerElement &&
      !this.avatarContainerElement.contains(event.target) &&
      event.target !== this.userMenuElement &&
      !this.userMenuElement.contains(event.target)
    ) {
      this.userMenuElement.classList.add("hide");
    }
  };

  /**
   * @method changeText
   * @description метод, меняющий текст, сигнализирующий о том показываются ли сейчас архивные чаты
   */
  changeText() {
    const element = this.userMenuElement.querySelector(".hideArchived");

    if (localStorage.getItem("archiveState") === "true") {
      this.table.hideArchive();
      element.textContent = "Показать архивные";
    } else if (localStorage.getItem("archiveState") === "false") {
      this.table.showArchive();
      element.textContent = "Скрыть архивные";
    }
  }

  /**
   * @method reloadChats
   * @description метод, который выполняет побновление списка чатов
   */
  reloadChats = () => {
    this.table.updateChats();
    this.userMenuElement.classList.add("hide");
  };

  /**
   * @method logout
   * @description метод, который выполняет выход из аккаунта
   */
  logout = () => {
    eel.logout()();
    document.querySelector(".spinner_large").classList.add("hide");
    document.querySelector(".table-container.main-table").classList.add("hide");
    const login = new Login()
    login.init()
  };
}
