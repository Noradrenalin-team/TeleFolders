import Table from "../TableWidget/index.js";

export default class Header {
  constructor(data) {
    this.data = data;
    this.avatarContainerElement = document.querySelector(".avatar");
    this.userMenuElement = document.querySelector(".user-menu");
  }

  init = () => {
    this.avatarContainerElement.addEventListener(
      "click",
      this.handleAvatarClick
    );
  };

  changeAvatar = (picture) => {
    this.avatarContainerElement.querySelector(".header .avatar img").src =
      picture ? picture : "/img/folders_type_contacts@3x.png";
  };

  handleAvatarClick = (event) => {
    if (this.userMenuElement.className === "user-menu") {
      this.userMenuElement.classList.add("hide");
    } else if (this.userMenuElement.className === "user-menu hide") {
      this.userMenuElement.classList.remove("hide");
    }

    if (event.target.className === "hideArchived") {
      event.stopPropagation();
    } else if (event.target.className === "reloadChatsList") {
      this.reloadChats();
    } else if (event.target.className === "logout") {
      this.logout(event);
    } else if (event.target.className === "user-menu") {
      event.stopPropagation();
    } else if (event.target.alt === "avatar") return;

    this.userMenuElement.querySelector(".username").textContent =
      "@" + this.data.username;
  };

  reloadChats = () => {
    new Table().updateChats();
    this.userMenuElement.classList.add("hide");
  };

  logout = () => {
    eel.logout()();
    window.location.reload();
  };
}
