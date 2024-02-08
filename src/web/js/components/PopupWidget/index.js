export class Popup {
  constructor(content) {
    let container = /* html */ `<div id="popup" class="popup-container popup-hidden"></div>`
    document.querySelector('body').insertAdjacentHTML('afterbegin', container)

    this.content = content
    this.popup = document.getElementById("popup");
  }

  show = () => {
    this.popup.classList.remove("popup-hidden");
    this.popup.textContent = "";

    this.popup.insertAdjacentHTML("beforeend", this.content);
  }

  close = () => {
    this.popup.classList.add("popup-hidden");
    this.popup.textContent = "";
  }
}