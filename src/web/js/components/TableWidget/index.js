import Popup from "../PopupWidget/index.js";

export default class Table {
  constructor() {
    if (
      localStorage.getItem("archiveState") === null ||
      localStorage.getItem("archiveState") === undefined
    ) {
      localStorage.setItem("archiveState", true);
    }
    this.archiveState =
      localStorage.getItem("archiveState") === "true" ? true : false;

    if (!Table.instance) {
      Table.instance = this;
    }

    return Table.instance;
  }

  getData = async () => {
    this.chats = await eel.get_all_chats()();
    this.folders = await eel.get_folders()();

    console.log(this.chats);

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
    const trElement = document.querySelector(".table thead tr");
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
    3;

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
    const tbodyElement = document.querySelector(".table tbody");
    tbodyElement.textContent = "";

    // отрисовка td с названием чата
    if (folders.length === 0) {
      chats.map((value) => {
        tbodyElement.insertAdjacentHTML(
          "beforeend",
          /* html */ `
      <td data-id="${value.chat_id}">${value.title}</td>
    `,
        );
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
      tbodyElement.insertAdjacentHTML(
        "beforeend",
        /* html */ `
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
    `,
      );
    });

    // отрисовка строки чата с кнопками
    chats.map((value) => {
      const id = Number(localStorage.getItem("user-id"));
      const archiveState =
        localStorage.getItem("archiveState") === "true" ? true : false;

      const imagePath = value.archived
        ? "/img/svg/plus-black.svg"
        : "/img/svg/plus-white.svg";

      if (!archiveState) {
        if (value.archived) {
        } else {
          tbodyElement.insertAdjacentHTML(
            "beforeend",
            /* html */ `
                <tr
                  data-archive-state="${value.archived}"
                  data-chat-id="${value.chat_id}"
                >
                  <th data-chat-id="${value.chat_id}">
                    <div class='wrapper'>
                      <p>${id === value.chat_id ? "Избранное" : value.title}</p>
                      <!-- <button> -->
                        <!-- pin white -->
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
              `,
          );
        }
      } else {
        tbodyElement.insertAdjacentHTML(
          "beforeend",
          /* html */ `
              <tr
                data-archive-state="${value.archived}"
                data-chat-id="${value.chat_id}"
              >
                <th data-chat-id="${value.chat_id}">
                  <div class='wrapper'>
                    <p>${id === value.chat_id ? "Избранное" : value.title}</p>
                    <!-- <button> -->
                      <!-- pin white -->
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
            `,
        );
      }
    });

    tbodyElement.addEventListener("click", (event) => {
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
      }
    });
  }

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
    let tdElement = event.parentElement.parentElement;

    let folderId = tdElement.getAttribute("data-folder-id");
    let chatId = tdElement.getAttribute("data-chat-id");

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
      } else if (relation === "exclude") {
        imagePath = "/img/svg/minus-black.svg";
        event.classList.remove("pinned");
        event.classList.add("exclude");
      } else if (relation === "pinned") {
        imagePath = "/img/svg/pin-black.svg";
        event.classList.remove("include");
        event.classList.add("pinned");
      } else if (relation === null) {
        imagePath = "/img/svg/plus-white.svg";
        event.classList.remove("exclude");
        event.classList.add("null");
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
    console.log("show");
    this.drawChats();
  };

  hideArchive = () => {
    localStorage.setItem("archiveState", false);
    this.archiveState = false;
    console.log("hide");
    this.drawChats();
  };

  addFolder() { }

  async updateChats() {
    this.getData();
  }
}
