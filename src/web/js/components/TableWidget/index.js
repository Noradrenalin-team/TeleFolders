import Popup from "../PopupWidget/index.js";

export default class Table {
  constructor() {
    this.getData();
  }

  getData = async () => {
    this.chats = await eel.get_all_chats()();
    this.folders = await eel.get_folders()();

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
    const theadElement = document.querySelector(".table thead tr");
    theadElement.textContent = "";
    const folders = this.folders;

    let tableHead = "";

    tableHead += /* html */ `
      <th>Все чаты</th>
    `;

    folders.map((value) => {
      tableHead += /* html */ `
        <th>${value.folder_title}</th>
      `;
    });

    tableHead += /* html */ `
      <th id='add-folder'>+</th>
    `;

    theadElement.insertAdjacentHTML("beforeend", tableHead);

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
  }

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
    `
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
            ${folders
              .map((folder) => {
                return /* html */ `
                  <td
                    class="td flag"
                    data-flag="${value}"
                    data-flag-state="${folder.flags[value]}"
                    data-folder-id="${folder.folder_id}"
                  >
                    <div class='buttons flag'>${this.setFlugsButton(folder, value)}</div>
                  </td>
                `;
              })
              .join("")}
          </tr>
    `
      );
    });

    // отрисовка строки чата с кнопками
    chats.map((value) => {
      tbodyElement.insertAdjacentHTML(
        "beforeend",
        /* html */ `
          <tr>
            <th data-chat-id="${value.chat_id}">
              <div class='wrapper'>
                <p>${value.title}</p>
                <!-- <button> -->
                  <!-- pin white -->
                  <!-- <img src="/img/svg/pin-white.svg" /> -->
                <!-- </button> -->
              </div>
            </th>
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
        `
      );
    });

    tbodyElement.addEventListener("click", (event) => {
      if (event.target.className === "button exclude") {
        this.setChatRelation(event.target, "exclude");
      } else if (event.target.className === "button include") {
        this.setChatRelation(event.target, "include");
      } else if (event.target.className === "button pinned") {
        this.setChatRelation(event.target, "pinned");
      } else if (event.target.className === 'buttons flag') {
        let _event = event.target.parentElement
        this.flagsOnClick(_event)
      } else if (event.target.className === 'button flag') {
        let _event = event.target.parentElement.parentElement
        this.flagsOnClick(_event)
      }
    });
  }

  setChatsButtons(folderId, userInfo) {
    let minusPath = "/img/svg/minus-white.svg";
    let plusPath = "/img/svg/plus-white.svg";
    let pinPath = "/img/svg/pin-white.svg";
    let pinValue = false;
    let plusValue = false;
    let minusValue = false;

    if (userInfo.folders["include"].includes(folderId)) {
      plusPath = "/img/svg/plus-black.svg";
      plusValue = true;
    } else if (userInfo.folders["exclude"].includes(folderId)) {
      minusPath = "/img/svg/minus-black.svg";
      minusValue = true;
    } else if (userInfo.folders["pinned"].includes(folderId)) {
      pinPath = "/img/svg/pin-black.svg";
      pinValue = true;
    }

    let result = /* html */ `
      <button
        class='button pinned'
        data-button-type='pinned'
        data-value='${pinValue}'
      >
        <img src='${pinPath}' />
      </button>
      <button
        class='button include'
        data-button-type='include'
        data-value='${plusValue}'
      >
        <img src='${plusPath}' />
      </button>
      <button
        class='button exclude'
        data-button-type='exclude'
        data-value='${minusValue}'
      >
        <img src='${minusPath}' />
      </button>
    `;

    return result;
  }

  setFlugsButton = (folder, folderFlag) => {
    let result = [
      "exclude_muted",
      "exclude_read",
      "exclude_archived",
    ].includes(folderFlag)
      ? /* html */ `
      <button class='button flag'>
        ${
          folder.flags[folderFlag]
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
        ${
          folder.flags[folderFlag]
            ? /* html */ `
              <img src="/img/svg/plus-black.svg" />
          `
            : /* html */ `
            <img src="/img/svg/plus-white.svg" />
          `
        }
      </button>`;
    return result;
  }

  setChatRelation = async (event, relation) => {
    let tdElement = event.parentElement.parentElement;
    let buttonsElement = event.parentElement;

    let value = event.getAttribute("data-value") === "true" ? true : false;
    let folderId = tdElement.getAttribute("data-folder-id");
    let chatId = tdElement.getAttribute("data-chat-id");

    relation = value ? null : relation;

    const a = await eel.set_chat_folder_relation(
      Number(chatId),
      Number(folderId),
      relation
    )();

    if (a.success) {
      if (value) {
        event.setAttribute("data-value", !value);
        let buttonType = event.getAttribute("data-button-type");

        if (buttonType === "pinned") {
          event.innerHTML = /* html */ `
              <img src="/img/svg/pin-white.svg" />
            `;
        } else if (buttonType === "include") {
          event.innerHTML = /* html */ `
              <img src="/img/svg/plus-white.svg" />
            `;
        } else if (buttonType === "exclude") {
          event.innerHTML = /* html */ `
              <img src="/img/svg/minus-white.svg" />
            `;
        }
        return;
      }

      let buttons = buttonsElement.querySelectorAll("button");

      buttons.forEach((item) => {
        let buttonType = item.getAttribute("data-button-type");

        if (relation === buttonType) {
          if (buttonType === "pinned") {
            item.innerHTML = /* html */ `
              <img src="/img/svg/pin-black.svg" />
            `;
          } else if (buttonType === "include") {
            item.innerHTML = /* html */ `
              <img src="/img/svg/plus-black.svg" />
            `;
          } else if (buttonType === "exclude") {
            item.innerHTML = /* html */ `
              <img src="/img/svg/minus-black.svg" />
            `;
          }
        }

        if (relation !== buttonType) {
          item.setAttribute("data-value", false);
          if (value) {
          }
          if (buttonType === "pinned") {
            item.innerHTML = /* html */ `
              <img src="/img/svg/pin-white.svg" />
            `;
          } else if (buttonType === "include") {
            item.innerHTML = /* html */ `
              <img src="/img/svg/plus-white.svg" />
            `;
          } else if (buttonType === "exclude") {
            item.innerHTML = /* html */ `
              <img src="/img/svg/minus-white.svg" />
            `;
          }
        }
      });

      event.setAttribute("data-value", !value);
    }
    if (!a.success) {
      const text =
        a.error_code === "folder_empty_error"
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

  flagsOnClick = async (event) => {
    let folderId = event.getAttribute("data-folder-id");
    let flag = event.getAttribute("data-flag");
    let value =
      event.getAttribute("data-flag-state") === "true" ? true : false;
    let a = await eel.set_folder_flag(Number(folderId), flag, !value)();

    if (a.success === true) {
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
    if (!a.success) {
      const text =
        a.error_code === "folder_empty_error"
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

  toggleArchive() {}

  addFolder() {}

  async updateChats() {
    this.chats = await this.getChats();
    this.folders = await this.getFolders();

    await this.drawHeader();
    await this.drawChats();
  }
}
