import Popup from "../PopupWidget/index.js";
import FloatView from "../FloatViewWidget/index.js";

export default class Table {
  constructor() {
    if (
      JSON.parse(localStorage.getItem("archiveState")) === null ||
      JSON.parse(localStorage.getItem("archiveState")) === undefined
    ) {
      localStorage.setItem("archiveState", true);
    }
    this.archiveState =
      JSON.parse(localStorage.getItem("archiveState")) === true;

    if (!Table.instance) {
      Table.instance = this;
    }

    return Table.instance;
  }

  getData = async () => {
    this.chats = await eel.get_all_chats()();
    this.folders = await eel.get_folders()();

    console.log("chats count: ", this.chats.length);
    console.log('chats: ', this.chats)
    console.log("folders count: ", this.folders.length);
    console.log('folders: ', this.folders)

    this.drawHeader();
    this.drawChats();
  };

  getChats = async () => {
    return await eel.get_all_chats()();
  };

  getFolders = async () => {
    return await eel.get_folders()();
  };

  async drawHeader() {
    const trElement = document.querySelector(
      ".table-container .table thead tr",
    );
    trElement.textContent = "";
    const folders = this.folders;

    let tableHead = "";

    tableHead += /* html */ `
      <th class="th">Все чаты</th>
    `;

    tableHead += /* html */ `
        <th>
          <span>Архив</span>
        </th>
      `;

    folders.map((value) => {
      tableHead += /* html */ `
        <th class="th"><span>${value.folder_title}</span></th>
      `;
    });

    tableHead += /* html */ `
      <th  class="th" id='add-folder'>+</th>
    `;

    trElement.insertAdjacentHTML("beforeend", tableHead);

    document
      .getElementById("add-folder")
      .addEventListener("click", this.handleAddFolder);
  }

  handleAddFolder = () => {
    const popupComponent = new Popup(`
      <div class='popup-content'>
        <h2>Добавление папки</h2>
        <label for='folder-name'>Введите название папки</label>
        <input id='folder-name' type='text' />
        <div class='buttons'>
          <button id='popup-done'>Добавить</button>
          <button id='popup-cancle'>Отменить</button>
        </div>
      </div>
    `);

    popupComponent.show();

    function addFolderHandler() {
      document
        .getElementById("popup-cancle")
        .removeEventListener("click", cancleHandler);

      popupComponent.close();
    }

    function cancleHandler() {
      document
        .getElementById("popup-done")
        .removeEventListener("click", addFolderHandler);

      popupComponent.close();
    }

    document
      .getElementById("popup-done")
      .addEventListener("click", addFolderHandler, { once: true });
    document
      .getElementById("popup-cancle")
      .addEventListener("click", cancleHandler, { once: true });
  };

  async drawChats() {
    const chats = this.chats;
    const folders = this.folders;
    const tbodyElement = document.querySelector(
      ".table-container .table tbody",
    );
    tbodyElement.textContent = "";

    let html = "";

    // отрисовка td с названием чата
    if (folders.length === 0) {
      chats.map((value) => {
        html += /* html */ `
          <td data-id="${value.chat_id}">${value.title}</td>
        `;
      });
      return;
    }

    function setName(value) {
      const flags = {
        contacts: "Контакты",
        non_contacts: "Не контакты",
        groups: "Группы",
        broadcasts: "Каналы",
        bots: "Боты",
        exclude_muted: "Без уведомлений",
        exclude_read: "Прочитанные",
        exclude_archived: "Архивированные",
      };

      return flags[value];
    }

    // отрисовка строки флага с кнопкой
    Object.keys(folders[0].flags).map((value) => {
      html += /* html */ `
          <tr>
            <th>${setName(value)}</th>
            <td></td>
            ${folders
          .map((folder) => {
            return /* html */ `
                  <td
                    class="td flag"
                    data-flag="${value}"
                    data-flag-state="${folder.flags[value]}"
                    data-folder-id="${folder.folder_id}"
                  >
                    <div class='buttons flag'>${this.setFlugsButton(
              folder,
              value,
            )}</div>
                  </td>
                `;
          })
          .join("")}
          </tr>
    `;
    });

    // отрисовка строки чата с кнопками
    chats.map((value, index) => {
      const id = Number(localStorage.getItem("user-id"));
      const archiveState =
        localStorage.getItem("archiveState") === "true" ? true : false;

      const imagePath = value.archived
        ? "/img/svg/plus-black.svg"
        : "/img/svg/plus-white.svg";

      if (!archiveState) {
        if (value.archived) {
        } else {
          html += /* html */ `
                <tr
                  data-chat-index="${index}"
                  data-archive-state="${value.archived}"
                  data-chat-id="${value.chat_id}"
                >
                  <th
                    data-chat-id="${value.chat_id}"
                    class="th title"
                  >
                    <div class='wrapper'>
                      <p class="title">
                        <!-- <a -->
                          <!-- href="https://t.me/c/${value.peer_id}" -->
                          <!-- target="_blank" -->
                        <!-- > -->
                          ${id === value.chat_id ? "Избранное" : value.title}
                        <!-- </a> -->
                      </p>
                      <!-- <button> -->
                        <!-- <img src="/img/svg/pin-white.svg" /> -->
                      <!-- </button> -->
                    </div>
                  </th>
                  <td>
                    <div class="buttons">
                      <button class="button archive">
                        <img src="${imagePath}"/>
                      </button>
                    </div>
                  </td>
                  ${folders
              .map((folder) => {
                return /* html */ `
                      <td
                        data-chat-id="${value.chat_id}"
                        data-folder-id="${folder.folder_id}"
                      >
                        <div class="buttons">
                          ${this.setChatsButtons(folder.folder_id, value)}
                        </div>
                      </td>
                    `;
              })
              .join("")}
                </tr>
              `;
        }
      } else {
        html += /* html */ `
              <tr
                data-chat-index="${index}"
                data-archive-state="${value.archived}"
                data-chat-id="${value.chat_id}"
              >
                <th
                  data-chat-id="${value.chat_id}"
                  th title
                >
                  <div class='wrapper'>
                    <p class="title">
                      <!-- <a -->
                        <!-- href="https://t.me/c/${value.peer_id}" -->
                        <!-- target="_blank" -->
                      <!-- > -->
                        ${id === value.chat_id ? "Избранное" : value.title}
                      <!-- </a> -->
                    </p>
                    <!-- <button> -->
                      <!-- <img src="/img/svg/pin-white.svg" /> -->
                    <!-- </button> -->
                  </div>
                </th>
                <td>
                  <div class="buttons">
                    <button class="button archive">
                      <img src="${imagePath}"/>
                    </button>
                  </div>
                </td>
                ${folders
            .map((folder) => {
              return /* html */ `
                    <td
                      data-chat-id="${value.chat_id}"
                      data-folder-id="${folder.folder_id}"
                    >
                      <div class="buttons">
                        ${this.setChatsButtons(folder.folder_id, value)}
                      </div>
                    </td>
                  `;
            })
            .join("")}
              </tr>
            `;
      }
    });

    tbodyElement.innerHTML = html;

    tbodyElement.removeEventListener("click", this.handleClick);
    tbodyElement.addEventListener("click", this.handleClick);
  }

  handleClick = (event) => {
    if (event.target.className === "button exclude") {
      this.setChatRelation(event.target, null);
    } else if (event.target.className === "button include") {
      this.setChatRelation(event.target, "pinned");
    } else if (event.target.className === "button pinned") {
      this.setChatRelation(event.target, "exclude");
    } else if (event.target.className === "button null") {
      this.setChatRelation(event.target, "include");
    } else if (event.target.className === "button archive") {
      this.setArchiveRelation(event.target);
    } else if (event.target.className === "buttons flag") {
      let _event = event.target.parentElement;
      this.setFlagRelation(_event);
    } else if (event.target.className === "button flag") {
      let _event = event.target.parentElement.parentElement;
      this.setFlagRelation(_event);
    } else if (event.target.className === "th title") {
      const parent = event.target.parentElement;
      const chatIndex = parent.getAttribute("data-chat-index");

      const floatView = new FloatView();

      floatView.close();
      floatView.chatIndex = chatIndex;
      floatView.show();
    } else if (event.target.className === "title") {
      const parent = event.target.parentElement.parentElement.parentElement;
      const chatIndex = parent.getAttribute("data-chat-index");

      const floatView = new FloatView();

      floatView.close();
      floatView.chatIndex = chatIndex;
      floatView.show();
    }
  };

  setChatsButtons(folderId, userInfo) {
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

  setFlugsButton = (folder, folderFlag) => {
    let result = ["exclude_muted", "exclude_read", "exclude_archived"].includes(
      folderFlag,
    )
      ? /* html */ `
      <button class='button flag'>
        ${folder.flags[folderFlag]
        ? /* html */ `
              <img src="/img/svg/minus-black.svg" />
          `
        : /* html */ `
              <img src="/img/svg/minus-white.svg" />
          `
      }
      </button>`
      : /* html */ `
      <button class='button flag'>
        ${folder.flags[folderFlag]
        ? /* html */ `
              <img src="/img/svg/plus-black.svg" />
          `
        : /* html */ `
            <img src="/img/svg/plus-white.svg" />
          `
      }
      </button>`;
    return result;
  };

  setChatRelation = async (event, relation) => {
    const tdElement = event.parentElement.parentElement;
    const trElement = event.parentElement.parentElement.parentElement;

    const folderId = tdElement.getAttribute("data-folder-id");
    const chatId = tdElement.getAttribute("data-chat-id");
    const chatIndex = trElement.getAttribute("data-chat-index");

    const response = await eel.set_chat_folder_relation(
      Number(chatId),
      Number(folderId),
      relation,
    )();

    if (response.success) {
      let imagePath = "";

      if (relation === "include") {
        imagePath = "/img/svg/plus-black.svg";
        event.classList.remove("null");
        event.classList.add("include");

        if (!this.chats[chatIndex].folders.include.includes(Number(folderId))) {
          this.chats[chatIndex].folders.include.push(Number(folderId));
        }
      } else if (relation === "pinned") {
        imagePath = "/img/svg/pin-black.svg";
        event.classList.remove("include");
        event.classList.add("pinned");

        // Удаляем из include, если есть
        const includeIndex = this.chats[chatIndex].folders.include.indexOf(
          Number(folderId),
        );
        if (includeIndex !== -1) {
          this.chats[chatIndex].folders.include.splice(includeIndex, 1);
        }

        if (!this.chats[chatIndex].folders.pinned.includes(Number(folderId))) {
          this.chats[chatIndex].folders.pinned.push(Number(folderId));
        }
      } else if (relation === "exclude") {
        imagePath = "/img/svg/minus-black.svg";
        event.classList.remove("pinned");
        event.classList.add("exclude");

        // Удаляем из pinned, если есть
        const pinnedIndex = this.chats[chatIndex].folders.pinned.indexOf(
          Number(folderId),
        );
        if (pinnedIndex !== -1) {
          this.chats[chatIndex].folders.pinned.splice(pinnedIndex, 1);
        }

        if (!this.chats[chatIndex].folders.exclude.includes(Number(folderId))) {
          this.chats[chatIndex].folders.exclude.push(Number(folderId));
        }
      } else if (relation === null) {
        imagePath = "/img/svg/plus-white.svg";
        event.classList.remove("exclude");
        event.classList.add("null");

        const excludeIndex = this.chats[chatIndex].folders.exclude.indexOf(
          Number(folderId),
        );
        if (excludeIndex !== -1) {
          this.chats[chatIndex].folders.exclude.splice(excludeIndex, 1);
        }
      }

      event.innerHTML = `
        <img src='${imagePath}' />
      `;
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

  setFlagRelation = async (event) => {
    let folderId = event.getAttribute("data-folder-id");
    let flag = event.getAttribute("data-flag");
    let value = JSON.parse(event.getAttribute("data-flag-state"));
    let response = await eel.set_folder_flag(Number(folderId), flag, !value)();

    if (response.success === true) {
      event.setAttribute("data-flag-state", !value);
      let result = [
        "exclude_muted",
        "exclude_read",
        "exclude_archived",
      ].includes(flag);

      if (value) {
        if (result) {
          event.innerHTML = /* html */ `
          <div class='buttons flag'>
            <button class='button flag'>
              <img src="/img/svg/minus-white.svg" />
            </button>
          </div>
        `;
        } else {
          event.innerHTML = /* html */ `
          <div class='buttons flag'>
            <button class='button flag'>
              <img src="/img/svg/plus-white.svg" />
            </button>
          </div>
          `;
        }
      } else {
        if (result) {
          event.innerHTML = /* html */ `
          <div class='buttons flag'>
            <button class='button flag'>
              <img src="/img/svg/minus-black.svg" />
            </button>
          </div>
        `;
        } else {
          event.innerHTML = /* html */ `
          <div class='buttons flag'>
            <button class='button flag'>
              <img src="/img/svg/plus-black.svg" />
            </button>
          </div>
        `;
        }
      }
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

  setArchiveRelation = async (event) => {
    let trElement = event.parentElement.parentElement.parentElement;
    let chatId = Number(trElement.getAttribute("data-chat-id"));
    let value = JSON.parse(trElement.getAttribute("data-archive-state"));

    let response = await eel.set_chat_archive(Number(chatId), !value)();

    value = !value;

    let foundChatIndex = this.chats.findIndex((chat) => {
      return chat.chat_id === chatId;
    });

    this.chats[foundChatIndex].archived = value;

    if (response.success) {
      trElement.setAttribute("data-archive-state", value);
      let imagePath = "";

      if (value) {
        imagePath = "/img/svg/plus-black.svg";
      } else {
        imagePath = "/img/svg/plus-white.svg";
      }

      if (value && !this.archiveState) {
        trElement.style.display = "none";
      }

      event.innerHTML = /* html */ `
          <img src="${imagePath}" />
        `;
    } else {
      console.log("err");
    }
  };

  showArchive = () => {
    localStorage.setItem("archiveState", true);
    this.archiveState = true;
    this.drawChats();
  };

  hideArchive = () => {
    localStorage.setItem("archiveState", false);
    this.archiveState = false;
    this.drawChats();
  };

  addFolder() { }

  async updateChats() {
    this.getData();
  }
}
