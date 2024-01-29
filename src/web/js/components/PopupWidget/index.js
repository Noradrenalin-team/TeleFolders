export class Popup {
  show(content) {
    let popup = document.getElementById("popup");
    popup.classList.remove("popup-hidden");
    popup.textContent = "";

    popup.insertAdjacentHTML("beforeend", content);
  }

  close() {
    let popup = document.getElementById("popup");
    popup.classList.add("popup-hidden");
    popup.textContent = "";
  }

  init() {
    let container = /* html */ `<div id="popup" class="popup-container popup-hidden"></div>`
    document.querySelector('body').insertAdjacentHTML('afterbegin', container)
  }
}