import Table from "../TableWidget/index.js";
import Popup from "../PopupWidget/index.js";

class FloatView {
  constructor() {
    this.chatIndex;
    this.counter = 0;

    if (!FloatView.instance) {
      document.querySelector("body").insertAdjacentHTML(
        "afterbegin",
        /* html */ `
          <div
            id="another-view-container"
            class="another-view-container"
          ></div>
        `,
      );

      FloatView.instance = this;
    }

    this.container = document.getElementById("another-view-container");

    return FloatView.instance;
  }

  nextChat = () => { };

  prevChat = () => { };

  close = async () => {
    if (this.counter >= 1) {
      this.counter = 0;
      new Table().drawChats();
    }

    this.container.removeEventListener("click", this.handleClickListener);
    this.container.classList.add("another-view-hidden");
  };

  show = () => {
    this.container.classList.remove("another-view-hidden");
    const table = new Table();

    const folders = table.folders;
    const title = table.chats[this.chatIndex].title;
    const chatId = table.chats[this.chatIndex].chat_id;

    let html = /* html */ `
      <div class="another-view">
        <div class="row">
          <h2>${title}</h2>
          <button>Добавить в архив</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Папка</th>
              <th>Значение</th>
            <tr>
          </thead>
          <tbody>
            ${folders
        .map(
          (folder) => /* html */ `
              <tr
                data-folder-id="${folder.folder_id}"
              >
                <th>${folder.folder_title}</th>
                <td>
                  ${this.setChatsButton(
            folder.folder_id,
            table.chats[this.chatIndex],
          )}
                </td>
              </tr>
              `,
        )
        .join("")}
          </tbody>
        </table>
      </div>
    `;

    this.container.innerHTML = html;

    this.handleClickListener = (event) => {
      this.handleClick(event, chatId);
    };

    this.container.addEventListener("click", this.handleClickListener);
  };

  handleClick = (event, chatId) => {
    if (event.target.id === "another-view-container") {
      this.close();
    } else if (event.target.className === "button exclude") {
      this.setChatRelation(event.target, null, chatId);
    } else if (event.target.className === "button include") {
      this.setChatRelation(event.target, "pinned", chatId);
    } else if (event.target.className === "button pinned") {
      this.setChatRelation(event.target, "exclude", chatId);
    } else if (event.target.className === "button null") {
      this.setChatRelation(event.target, "include", chatId);
    }
  };

  setChatsButton(folderId, userInfo) {
    let imagePath = "/img/svg/plus-white.svg";
    let value = "";

    if (userInfo.folders["include"].includes(folderId)) {
      imagePath = "/img/svg/plus-black.svg";
      value = "include";
    } else if (userInfo.folders["exclude"].includes(folderId)) {
      imagePath = "/img/svg/minus-black.svg";
      value = "exclude";
    } else if (userInfo.folders["pinned"].includes(folderId)) {
      imagePath = "/img/svg/pin-black.svg";
      value = "pinned";
    } else {
      imagePath = "/img/svg/plus-white.svg";
      value = "null";
    }

    let result = /* html */ `
      <button
        class='button ${value}'
      >
        <img src='${imagePath}' />
      </button>
    `;

    return result;
  }

  setChatRelation = async (event, relation, chatId) => {
    const trElement = event.parentElement.parentElement;
    const folderId = trElement.getAttribute("data-folder-id");

    const table = new Table();

    const response = await eel.set_chat_folder_relation(
      Number(chatId),
      Number(folderId),
      relation,
    )();

    if (response.success) {
      this.counter += 1;
      let imagePath = "";

      if (relation === "include") {
        imagePath = "/img/svg/plus-black.svg";
        event.classList.remove("null");
        event.classList.add("include");

        if (
          !table.chats[this.chatIndex].folders.include.includes(
            Number(folderId),
          )
        ) {
          table.chats[this.chatIndex].folders.include.push(Number(folderId));
        }

        // Удаляем из pinned, если есть
        const pinnedIndex = table.chats[this.chatIndex].folders.pinned.indexOf(
          Number(folderId),
        );
        if (pinnedIndex !== -1) {
          table.chats[this.chatIndex].folders.pinned.splice(pinnedIndex, 1);
        }
      } else if (relation === "pinned") {
        imagePath = "/img/svg/pin-black.svg";
        event.classList.remove("include");
        event.classList.add("pinned");

        // Удаляем из include, если есть
        const includeIndex = table.chats[
          this.chatIndex
        ].folders.include.indexOf(Number(folderId));
        if (includeIndex !== -1) {
          table.chats[this.chatIndex].folders.include.splice(includeIndex, 1);
        }

        if (
          !table.chats[this.chatIndex].folders.pinned.includes(Number(folderId))
        ) {
          table.chats[this.chatIndex].folders.pinned.push(Number(folderId));
        }
      } else if (relation === "exclude") {
        imagePath = "/img/svg/minus-black.svg";
        event.classList.remove("pinned");
        event.classList.add("exclude");

        // Удаляем из pinned, если есть
        const pinnedIndex = table.chats[this.chatIndex].folders.pinned.indexOf(
          Number(folderId),
        );
        if (pinnedIndex !== -1) {
          table.chats[this.chatIndex].folders.pinned.splice(pinnedIndex, 1);
        }

        if (
          !table.chats[this.chatIndex].folders.exclude.includes(
            Number(folderId),
          )
        ) {
          table.chats[this.chatIndex].folders.exclude.push(Number(folderId));
        }
      } else if (relation === null) {
        imagePath = "/img/svg/plus-white.svg";
        event.classList.remove("exclude");
        event.classList.add("null");

        const excludeIndex = table.chats[
          this.chatIndex
        ].folders.exclude.indexOf(Number(folderId));
        if (excludeIndex !== -1) {
          table.chats[this.chatIndex].folders.exclude.splice(excludeIndex, 1);
        }
      }

      // Устанавливаем изображение кнопки
      event.innerHTML = `<img src='${imagePath}' />`;
    }
    if (!response.success) {
      const text =
        response.error_code === "folder_empty_error"
          ? "Папка не может быть пустой"
          : "Произошла ошибка";
      const popupComponent = new Popup(/* html */ `
          <div class='popup-content'>
            <h2>Произошла ошибка</h2>
            <p>${text}</p>
            <div class='buttons'>
              <button id='popup-done'>OK</button>
            </div>
          </div>
        `);

      popupComponent.show();

      function addFolderHandler() {
        popupComponent.close();
      }

      document
        .getElementById("popup-done")
        .addEventListener("click", addFolderHandler, { once: true });
    }
  };
}
export default FloatView;
