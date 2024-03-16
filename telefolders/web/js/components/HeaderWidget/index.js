import Table from "../TableWidget/index.js";

export default class Header {
  constructor(data) {
    this.data = data;
    this.avatarContainerElement = document.querySelector(".avatar");
    this.userMenuElement = document.querySelector(".user-menu");
    this.init();
    this.table = new Table();
  }

  init = () => {
    this.avatarContainerElement.addEventListener(
      "click",
      this.handleAvatarClick,
    );
    window.addEventListener("click", this.handleWindowClick);
  };

  changeAvatar = (picture) => {
    this.avatarContainerElement.querySelector(".header .avatar img").src =
      picture ? picture : "/img/contacts.png";
  };

  handleAvatarClick = (event) => {
    event.stopPropagation();

    if (localStorage.getItem("archiveState") === "true") {
      const element = this.userMenuElement.querySelector(".hideArchived");
      element.textContent = "Скрыть архивные";
    } else if (localStorage.getItem("archiveState") === "false") {
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

  reloadChats = () => {
    this.table.updateChats();
    this.userMenuElement.classList.add("hide");
  };

  logout = () => {
    eel.logout()();
    window.location.reload();
  };
}
