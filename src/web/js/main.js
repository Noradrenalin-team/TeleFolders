import { loginPhone } from "./login.js";
import { Popup } from "./components/PopupWidget/index.js";
import { Table } from "./components/TableWidget/index.js";


export default async function start() {
  let response = await eel.get_user()();
  
  if (response === null) {
    document.querySelector(".login").classList.remove("hide");
    document
    .querySelector(".login-button")
    .addEventListener("click", loginPhone);
    return;
  }
  
  new Popup().init()
  new Table().init()
  
  document.querySelector(".login").classList.add("hide");
  document.querySelector(".table-container").classList.remove("hide");
  document.querySelector(".header .avatar img").src = response.picture
    ? response.picture
    : "/img/folders_type_contacts@3x.png";

  handleAvatarClick(response);
  // load()
}

async function handleAvatarClick(userData) {
  const avatarContainerElement = document.querySelector(".header .avatar");

  function handle(e) {
    e.stopPropagation()
    const userMenuElement = document.querySelector(".user-menu");
    const reloadChatsList = document.getElementById('reloadChatsList')

    reloadChatsList.addEventListener('click', new Table().updateChats())

    userMenuElement.classList.toggle("hide");
    userMenuElement.querySelector(".username").textContent =
      "@" + userData.username;

    document.addEventListener('click', (event) => {
      if (event.target.alt === 'avatar') return
      else userMenuElement.classList.add("hide");
    })


  }

  function logout(e) {
    e.preventDefault();

    eel.logout()();
    window.location.reload()
  }

  avatarContainerElement.addEventListener("click", handle);
  avatarContainerElement
    .querySelector(".logout")
    .addEventListener("click", logout);
}

start();
