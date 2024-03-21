import Table from "../TableWidget/index.js";
import Popup from "../PopupWidget/index.js";

class FloatView {
  constructor() {
    this.chatIndex;
    this.counter = 0;
    this.table = new Table();

    if (!FloatView.instance) {
      document.querySelector("body").insertAdjacentHTML(
        "afterbegin",
        /* html */ `
          <div
            id="float-view-container"
            class="float-view-container"
          ></div>
        `
      );

      FloatView.instance = this;
    }

    this.container = document.getElementById("float-view-container");

    return FloatView.instance;
  }

  nextChat = () => {
    this.container.removeEventListener("click", this.handleClickListener);
    let index = Number(this.chatIndex) + 1;
    const chatsLength = this.table.chats.length;
    const archiveState = JSON.parse(localStorage.getItem("archiveState"));

    while (true) {
      if (index >= chatsLength) {
        index = 0;
      }

      let chat = this.table.chats[index];

      if (!archiveState) {
        if (chat.archived) {
          index = index + 1;
        } else {
          this.chatIndex = index;
          this.container.innerHTML = "";

          this.draw();

          break;
        }
      } else {
        this.chatIndex = index;
        this.container.innerHTML = "";

        this.draw();

        break;
      }
    }
  };

  prevChat = () => {
    this.container.removeEventListener("click", this.handleClickListener);
    let index = Number(this.chatIndex) - 1;
    const chatsLength = this.table.chats.length;
    const archiveState = JSON.parse(localStorage.getItem("archiveState"));

    while (true) {
      if (index <= 0) {
        index = chatsLength - 1;
      }

      let chat = this.table.chats[index];

      if (!archiveState) {
        if (chat.archived) {
          index = index - 1;
        } else {
          this.chatIndex = index;
          this.container.innerHTML = "";

          this.draw();

          break;
        }
      } else {
        this.chatIndex = index;
        this.container.innerHTML = "";

        this.draw();

        break;
      }
    }
  };

  close = async () => {
    if (this.counter >= 1) {
      this.counter = 0;
      this.table.drawChats();
    }

    this.container.removeEventListener("click", this.handleClickListener);
    this.container.classList.add("float-view-hidden");
    document.removeEventListener("keydown", this.click);
  };

  show = () => {
    this.container.classList.remove("float-view-hidden");
    document.addEventListener("keydown", this.click);

    this.draw();
  };

  click = (event) => {
    console.log("123");
    if (event.code === "ArrowRight") {
      this.nextChat();
    } else if (event.code === "ArrowLeft") {
      this.prevChat();
    } else if (event.code === "Escape") {
      this.close();
    }
  };

  handleClick = (event, chatId) => {
    if (
      event.target.id === "float-view-container" ||
      event.target.className === "button close"
    ) {
      this.close();
    } else if (event.target.className === "button include") {
      this.setChatRelation(event.target, "include", chatId);
    } else if (event.target.className === "button pinned") {
      this.setChatRelation(event.target, "pinned", chatId);
    } else if (event.target.className === "button exclude") {
      this.setChatRelation(event.target, "exclude", chatId);
    } else if (event.target.className === "button next") {
      this.nextChat();
    } else if (event.target.className === "button prev") {
      this.prevChat();
    } else if (event.target.className === "button archive") {
      this.setArchive(event.target, chatId);
    }
  };

  setArchive = async (event, chatId) => {
    let archiveState = !this.table.chats[this.chatIndex].archived;
    console.log(archiveState);

    const response = await eel.set_chat_archive(chatId, archiveState)();

    if (response.success) {
      this.table.chats[this.chatIndex].archived = archiveState;

      let imagePath = "/img/svg/plus-white.svg";

      if (archiveState) {
        imagePath = "/img/svg/plus-black.svg";
        event.innerHTML = `<img src="${imagePath}" />`;
      } else {
        event.innerHTML = `<img src="${imagePath}" />`;
      }
    } else {
      const text = "Неисзвестная ошибка";
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

  draw = () => {
    const folders = this.table.folders;
    const title = this.table.chats[this.chatIndex].title;
    const chatId = this.table.chats[this.chatIndex].chat_id;
    const archiveState = this.table.chats[this.chatIndex].archived;

    let html = /* html */ `
      <div class="float-view">
        <div class="row">
          <h2>${title}</h2>
          <button class="button close">
            <img src="/img/svg/close.svg" />
          </button>
        </div>
        <div class="row">
        <button class="button prev">
          <img src="/img/svg/left-row.svg" />
        </button>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Папка</th>
                <th>Значение</th>
              <tr>
            </thead>
            <tbody>
              <tr>
                <th>Архив</th>
                <td>
                  <button
                    class='button archive'
                  >
                    <img src="${
                      archiveState
                        ? "/img/svg/plus-black.svg"
                        : "/img/svg/plus-white.svg"
                    }" />
                  </button>
                </td>
              </tr>
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
                      this.table.chats[this.chatIndex]
                    )}
                  </td>
                </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <button class="button next">
          <img src="/img/svg/right-row.svg" />
        </button>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    this.handleClickListener = (event) => {
      this.handleClick(event, chatId);
    };

    this.container.addEventListener("click", this.handleClickListener);
  };

  setChatsButton(folderId, userInfo) {
    let includePath = "/img/svg/plus-white.svg";
    let pinnedPath = "/img/svg/pin-white.svg";
    let excludePath = "/img/svg/minus-white.svg";

    if (userInfo.folders["include"].includes(folderId)) {
      includePath = "/img/svg/plus-black.svg";
    } else if (userInfo.folders["exclude"].includes(folderId)) {
      excludePath = "/img/svg/minus-black.svg";
    } else if (userInfo.folders["pinned"].includes(folderId)) {
      pinnedPath = "/img/svg/pin-black.svg";
    }

    let result = /* html */ `
      <button
        class='button include'
      >
        <img src='${includePath}' />
      </button>
      <button
        class='button pinned'
      >
        <img src='${pinnedPath}' />
      </button>
      <button
        class='button exclude'
      >
        <img src='${excludePath}' />
      </button>
    `;

    return result;
  }

  setChatRelation = async (event, relation, chatId) => {
    const trElement = event.parentElement.parentElement;
    const thElement = event.parentElement;
    const folderId = trElement.getAttribute("data-folder-id");

    let includePath = "/img/svg/plus-white.svg";
    let pinnedPath = "/img/svg/pin-white.svg";
    let excludePath = "/img/svg/minus-white.svg";

    let response

    if (relation === "include") {
      console.log('include')
      if (
        this.table.chats[this.chatIndex].folders.include.includes(
          Number(folderId)
        )) {
          console.log('false')
          response = await eel.set_chat_folder_relation(
            Number(chatId),
            Number(folderId),
          )();
      } else {
        console.log(relation)
        response = await eel.set_chat_folder_relation(
          Number(chatId),
          Number(folderId),
          relation
        )();
      }
    } else if (relation === "pinned") {
      console.log('pinned')
      if (
        this.table.chats[this.chatIndex].folders.pinned.includes(
          Number(folderId)
        )) {
          let res1 = await eel.set_chat_folder_relation(
            Number(chatId),
            Number(folderId),
            'include'
          )();

          if (res1.success) {
            response = await eel.set_chat_folder_relation(
              Number(chatId),
              Number(folderId),
            )();
          } else {
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
      } else {
        console.log(relation)
        response = await eel.set_chat_folder_relation(
          Number(chatId),
          Number(folderId),
          relation
        )();
      }
    } else if (relation === "exclude") {
      console.log('exclude')
      if (
        this.table.chats[this.chatIndex].folders.exclude.includes(
          Number(folderId)
          )) {
          console.log('false')
          response = await eel.set_chat_folder_relation(
            Number(chatId),
            Number(folderId),
          )();
      } else {
        console.log(relation)
        response = await eel.set_chat_folder_relation(
          Number(chatId),
          Number(folderId),
          relation
        )();
      }
    }

    if (response.success) {
      this.counter += 1;

      if (relation === "include") {
        if (
          this.table.chats[this.chatIndex].folders.include.includes(
            Number(folderId)
          )
        ) {
          thElement.innerHTML = /* html */ `
            <button
              class='button include'
            >
              <img src='${includePath}' />
            </button>
            <button
              class='button pinned'
            >
              <img src='${pinnedPath}' />
            </button>
            <button
              class='button exclude'
            >
              <img src='${excludePath}' />
            </button>
          `;
          let index = this.table.chats[this.chatIndex].folders.include.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.include.splice(index, 1);
          }
          index = this.table.chats[this.chatIndex].folders.exclude.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.exclude.splice(index, 1);
          }
          index = this.table.chats[this.chatIndex].folders.pinned.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.pinned.splice(index, 1);
          }
        } else {
          includePath = "/img/svg/plus-black.svg";

          thElement.innerHTML = /* html */ `
            <button
              class='button include'
            >
              <img src='${includePath}' />
            </button>
            <button
              class='button pinned'
            >
              <img src='${pinnedPath}' />
            </button>
            <button
              class='button exclude'
            >
              <img src='${excludePath}' />
            </button>
          `;
          this.table.chats[this.chatIndex].folders.include.push(
            Number(folderId)
          );

          let index = this.table.chats[this.chatIndex].folders.pinned.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.pinned.splice(index, 1);
          }
          index = this.table.chats[this.chatIndex].folders.exclude.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.exclude.splice(index, 1);
          }
        }
      } else if (relation === "pinned") {
        if (
          this.table.chats[this.chatIndex].folders.pinned.includes(
            Number(folderId)
          )
        ) {
          thElement.innerHTML = /* html */ `
            <button
              class='button include'
            >
              <img src='${includePath}' />
            </button>
            <button
              class='button pinned'
            >
              <img src='${pinnedPath}' />
            </button>
            <button
              class='button exclude'
            >
              <img src='${excludePath}' />
            </button>
          `;
          let index = this.table.chats[this.chatIndex].folders.include.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.include.splice(index, 1);
          }
          index = this.table.chats[this.chatIndex].folders.pinned.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.pinned.splice(index, 1);
          }
          index = this.table.chats[this.chatIndex].folders.exclude.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.exclude.splice(index, 1);
          }
        } else {
          pinnedPath = "/img/svg/pin-black.svg";

          thElement.innerHTML = /* html */ `
            <button
              class='button include'
            >
              <img src='${includePath}' />
            </button>
            <button
              class='button pinned'
            >
              <img src='${pinnedPath}' />
            </button>
            <button
              class='button exclude'
            >
              <img src='${excludePath}' />
            </button>
          `;
          this.table.chats[this.chatIndex].folders.pinned.push(
            Number(folderId)
          );

          let index = this.table.chats[this.chatIndex].folders.include.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.include.splice(index, 1);
          }
          index = this.table.chats[this.chatIndex].folders.exclude.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.exclude.splice(index, 1);
          }
        }
      } else if (relation === "exclude") {
        if (
          this.table.chats[this.chatIndex].folders.exclude.includes(
            Number(folderId)
          )
        ) {
          thElement.innerHTML = /* html */ `
            <button
              class='button include'
            >
              <img src='${includePath}' />
            </button>
            <button
              class='button pinned'
            >
              <img src='${pinnedPath}' />
            </button>
            <button
              class='button exclude'
            >
              <img src='${excludePath}' />
            </button>
          `;
          let index = this.table.chats[this.chatIndex].folders.include.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.include.splice(index, 1);
          }
          index = this.table.chats[this.chatIndex].folders.pinned.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.pinned.splice(index, 1);
          }
          index = this.table.chats[this.chatIndex].folders.exclude.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.exclude.splice(index, 1);
          }
        } else {
          excludePath = "/img/svg/minus-black.svg";

          thElement.innerHTML = /* html */ `
            <button
              class='button include'
            >
              <img src='${includePath}' />
            </button>
            <button
              class='button pinned'
            >
              <img src='${pinnedPath}' />
            </button>
            <button
              class='button exclude'
            >
              <img src='${excludePath}' />
            </button>
          `;
          this.table.chats[this.chatIndex].folders.exclude.push(
            Number(folderId)
          );

          let index = this.table.chats[this.chatIndex].folders.include.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.include.splice(index, 1);
          }
          index = this.table.chats[this.chatIndex].folders.pinned.indexOf(
            Number(folderId)
          );
          if (index !== -1) {
            this.table.chats[this.chatIndex].folders.pinned.splice(index, 1);
          }
        }
      }

      console.log(this.table.chats[this.chatIndex].folders);
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
