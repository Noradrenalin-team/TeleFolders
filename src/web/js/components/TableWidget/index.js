import { Popup } from "../PopupWidget/index.js";

export class Table {
  constructor() {
    this.getData();
    this.offset = 0;
  }

  getData = async () => {
    this.chats = await eel.get_all_chats()();
    this.folders = await eel.get_folders()();

    this.drawHeader();
    this.drawChats();
  };

  getChats = () => {
    return (async () => {
      return await eel.get_all_chats()();
    })();
  };

  getFolders = () => {
    return (async () => {
      return await eel.get_folders()();
    })();
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

    function handleAddFolder() {
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
        popupComponent.close();
      }

      function cancleHandler() {
        popupComponent.close();
      }

      document
        .getElementById("popup-done")
        .addEventListener("click", addFolderHandler);
      document
        .getElementById("popup-cancle")
        .addEventListener("click", cancleHandler);
    }

    document
      .getElementById("add-folder")
      .addEventListener("click", handleAddFolder);
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

    // возвращает разметку кнопки флага
    function setFlugsButton(folder, folderFlag) {
      let result = [
        "exclude_muted",
        "exclude_read",
        "exclude_archived",
      ].includes(folderFlag)
        ? /* html */ `
        <button class='button'>
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
        <button class='button'>
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

    // возвращает разметку кнопок чатов
    function setChatsButtons(folderId, userInfo) {
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
          class='button'
          data-button-type='pinned'
          data-value='${pinValue}'
          onclick="window.setChatRelation(event=this, relation='pinned')"
        >
          <img src='${pinPath}' />
        </button>
        <button
          class='button'
          data-button-type='include'
          data-value='${plusValue}'
          onclick="window.setChatRelation(event=this, relation='include')"
        >
          <img src='${plusPath}' />
        </button>
        <button
          class='button'
          data-button-type='exclude'
          data-value='${minusValue}'
          onclick="window.setChatRelation(event=this, relation='exclude')"
        >
          <img src='${minusPath}' />
        </button>
      `;

      window.setChatRelation = async function (event, relation) {
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
      };

      return result;
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
                    data-flag="${value}"
                    data-flag-state="${folders[0].flags[value]}"
                    data-folder-id="${folder.folder_id}"
                    onclick="window.flagsOnClick(this)"
                  >
                    <div class='buttons'>${setFlugsButton(folder, value)}</div>
                  </td>
                `;
              })
              .join("")}
          </tr>
    `
      );

      // обработчик клика по кнопке флага
      window.flagsOnClick = async function (event) {
        let folderId = event.getAttribute("data-folder-id");
        let flag = event.getAttribute("data-flag");
        let value =
          event.getAttribute("data-flag-state") === "true" ? true : false;
        console.log(folderId + " request");
        let a = await eel.set_folder_flag(Number(folderId), flag, !value)();
        console.log(folderId, a);

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
              <div class='buttons'>
                <button class='button'>
                  <img src="/img/svg/minus-white.svg" />
                </button>
              </div>
            `;
            } else {
              event.innerHTML = /* html */ `
              <div class='buttons'>
                <button class='button'>
                <img src="/img/svg/plus-white.svg" />
                </button>
              </div>
              `;
            }
          } else {
            if (result) {
              event.innerHTML = /* html */ `
              <div class='buttons'>
                <button class='button'>
                  <img src="/img/svg/minus-black.svg" />
                </button>
              </div>
            `;
            } else {
              event.innerHTML = /* html */ `
              <div class='buttons'>
                <button class='button'>
                  <img src="/img/svg/plus-black.svg" />
                </button>
              </div>
            `;
            }
          }
        }
      };
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
                <button>
                  pin white
                  <img src="/img/svg/pin-black.svg" />
                </button>
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
                    ${setChatsButtons(folder.folder_id, value)}
                  </div>
                </td>
              `;
              })
              .join("")}
          </tr>
        `
      );
    });
  }

  toggleArchive() {}

  // addFolder() {}

  async updateChats() {
    this.chats = await this.getChats();
    this.folders = await this.getFolders();

    await this.drawHeader();
    await this.drawChats();
  }
}
