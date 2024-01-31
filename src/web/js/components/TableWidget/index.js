export class Table {
  get chats() {
    return (async () => {
      return await eel.get_all_chats()();
    })();
  }

  get folders() {
    return (async () => {
      return await eel.get_folders()();
    })();
  }

  async init() {
    const folders = await this.folders;
    const chats = await this.chats;

    console.log(folders);
    console.log(chats);
    await this.drawHeader(folders)
    await this.drawChats(chats, folders)
  }

  async drawHeader(folders) {
    const theadElement = document.querySelector(".table thead tr");
    theadElement.textContent = "";

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
      const popupComponet = new Popup();

      let popupContent = /* html */ `
      <div class='popup-content'>
        <h2>Добавление папки</h2>
        <label for='folder-name'>Введите название папки</label>
        <input id='folder-name' type='text' />
        <div class='buttons'>
          <button id='popup-done'>Добавить</button>
          <button id='popup-cancle'>Отменить</button>
        </div>
      </div>
    `;

      popupComponet.show(popupContent);

      function addFolderHandler() {
        // add
        popupComponet.close();
      }

      function cancleHandler() {
        popupComponet.close();
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

  async drawChats(chats, folders) {
    const tbodyElement = document.querySelector(".table tbody");
    tbodyElement.textContent = "";

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
      let result = "";

      switch (value) {
        case "contacts":
          result = "Контакты";
          break;
        case "non_contacts":
          result = "Не контакты";
          break;
        case "groups":
          result = "Группы";
          break;
        case "broadcasts":
          result = "Каналы";
          break;
        case "bots":
          result = "Боты";
          break;
        case "exclude_muted":
          result = "Без уведомлений";
          break;
        case "exclude_read":
          result = "Прочитанные";
          break;
        case "exclude_archived":
          result = "Архивированные";
          break;

        default:
          break;
      }

      return result;
    }

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
                <!-- minus white -->
                <img src="/img/svg/minus-black.svg" />
            `
              : /* html */ `
                <!-- minus black -->
                <img src="/img/svg/minus-white.svg" />
            `
          }
        </button>`
        : /* html */ `
        <button class='button'>
          ${
            folder.flags[folderFlag]
              ? /* html */ `
                <!-- plus white -->
                <img src="/img/svg/plus-black.svg" />
            `
              : /* html */ `
              <!-- plus black -->
              <img src="/img/svg/plus-white.svg" />
            `
          }
        </button>`;
      return result;
    }

    function setChatsButtons(folderId, userInfo) {
      let minusPath = "/img/svg/minus-white.svg";
      let plusPath = "/img/svg/plus-white.svg";
      let pinPath = "/img/svg/pin-white.svg";

      if (userInfo.folders["include"].includes(folderId)) {
        plusPath = "/img/svg/plus-black.svg";
      } else if (userInfo.folders["exclude"].includes(folderId)) {
        minusPath = "/img/svg/minus-black.svg";
      } else if (userInfo.folders["pinned"].includes(folderId)) {
        pinPath = "/img/svg/pin-black.svg";
      }

      let result = /* html */ `
        <button
          class='button'
          data-button-type='pinned'
          onclick="window.setChatRelation(event=this, relation='pinned')"
        >
          <img src='${pinPath}' />
        </button>
        <button
          class='button'
          data-button-type='include'
          onclick="window.setChatRelation(event=this, relation='include')"
        >
          <img src='${plusPath}' />
        </button>
        <button
          class='button'
          data-button-type='exclude'
          onclick="window.setChatRelation(event=this, relation='exclude')"
        >
          <img src='${minusPath}' />
        </button>
      `;

      window.setChatRelation = async function (event, relation) {
        let tdElement = event.parentElement.parentElement;
        let buttonsElement = event.parentElement;

        let folderId = tdElement.getAttribute("data-folder-id");
        let chatId = tdElement.getAttribute("data-chat-id");

        const a = await eel.set_chat_folder_relation(
          Number(chatId),
          Number(folderId),
          relation
        )();

        if (a.success) {
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
        }
      };

      return result;
    }

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
                  <!-- minus black -->
                  <img src="/img/svg/minus-white.svg" />
                </button>
              </div>
            `;
            } else {
              event.innerHTML = /* html */ `
              <div class='buttons'>
                <button class='button'>
                <!-- plus black -->
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
                  <!-- minus white -->
                  <img src="/img/svg/minus-black.svg" />
                </button>
              </div>
            `;
            } else {
              event.innerHTML = /* html */ `
              <div class='buttons'>
                <button class='button'>
                  <!-- plus white -->
                  <img src="/img/svg/plus-black.svg" />
                </button>
              </div>
            `;
            }
          }
        }
      };
    });

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
                  <!-- <img src="/img/svg/pin-black.svg" /> -->
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

  addFolder() {}

  async updateChats() {
    const folders = await this.folders;
    const chats = await this.chats;

    console.log(folders);
    console.log(chats);
    await this.drawHeader(folders)
    await this.drawChats(chats, folders)
  }
}
