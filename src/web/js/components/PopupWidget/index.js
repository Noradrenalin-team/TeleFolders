export class Popup {
  constructor(content) {
    let container = /* html */ `<div id="popup" class="popup-container popup-hidden"></div>`
    document.querySelector('body').insertAdjacentHTML('afterbegin', container)

    this.content = content
    this.popup = document.getElementById("popup");
  }

  show = () => {
    // let container = document.querySelector('.popup-container')
    this.popup.classList.remove("popup-hidden");
    this.popup.textContent = "";

    this.popup.insertAdjacentHTML("beforeend", this.content);

    // container.addEventListener('click', (e) => {
    //   e.stopPropagation()
    //   container.classList.add("popup-hidden");
    // })
  }

  close = () => {
    this.popup.classList.add("popup-hidden");
    this.popup.textContent = "";
  }
}

// function handleAddFolder() {
//   const popupComponent = new Popup(`
//     <div class='popup-content'>
//       <h2>Добавление папки</h2>
//       <label for='folder-name'>Введите название папки</label>
//       <input id='folder-name' type='text' />
//       <div class='buttons'>
//         <button id='popup-done'>Добавить</button>
//         <button id='popup-cancle'>Отменить</button>
//       </div>
//     </div>
//   `);

//   popupComponent.show();

//   function addFolderHandler() {
//     popupComponent.close();
//   }

//   function cancleHandler() {
//     popupComponent.close();
//   }

//   document
//     .getElementById("popup-done")
//     .addEventListener("click", addFolderHandler);
//   document
//     .getElementById("popup-cancle")
//     .addEventListener("click", cancleHandler);
// }