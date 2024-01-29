async function load() {
  const tbodyElement = document.querySelector(".table tbody");
  const theadElement = document.querySelector(".table thead tr");
  tbodyElement.textContent = "";
  theadElement.textContent = "";

  const chats = await eel.get_all_chats()();
  console.log(chats);
  const folders = await eel.get_folders()();
  console.log(folders);

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
    <th id='add-folder' onclick='window.popup.show()'>+</th>
  `;

  theadElement.insertAdjacentHTML("beforeend", tableHead);

  window.popup.show = () => {
    let popup = document.getElementById("popup");
    popup.classList.remove("popup-hidden");
    popup.textContent = "";

    let popupContent = /* html */ `
      <div class='popup-content'>
        <h2>Добавление папки</h2>
        <label for='folder-name'>Введите название папки</label>
        <input id='folder-name' type='text' />
        <div class='buttons'>
          <button id='addFolder'>Добавить</button>
          <button id='cancle'>Отменить</button>
        </div>
      </div>
    `;

    popup.insertAdjacentHTML("beforeend", popupContent);

    function addFolderHandler() {
      popup.textContent = "";
      popup.classList.add("popup-hidden");
    }

    function cancleHandler() {
      popup.textContent = "";
      popup.classList.add("popup-hidden");
    }

    document
      .getElementById("addFolder")
      .addEventListener("click", addFolderHandler);
    document.getElementById("cancle").addEventListener("click", cancleHandler);
  };

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
    let result = ["exclude_muted", "exclude_read", "exclude_archived"].includes(
      folderFlag,
    )
      ? /* html */ `
      <button class='button'>
        ${folder.flags[folderFlag]
        ? /* html */ `
              <!-- minus white -->
              <img src="../img/svg/minus-white.svg" />
          `
        : /* html */ `
              <!-- minus black -->
              <img src="../img/svg/minus-black.svg" />
          `
      }
      </button>`
      : /* html */ `
      <button class='button'>
        ${folder.flags[folderFlag]
        ? /* html */ `
              <!-- plus white -->
              <img src="../img/svg/plus-white.svg" />
          `
        : /* html */ `
            <!-- plus black -->
            <img src="../img/svg/plus-black.svg" />
          `
      }
      </button>`;
    return result;
  }

  function setChatsButtons() {
    
    let result = /* html */ `
    <button
      class='button'
      data-button-type='pinned'
      onclick="window.setChatRelation(event=this, relation='pinned')"
    >
      <!-- pin black -->
      <img src="../img/svg/pin-black.svg" />
    </button>
    <button
      class='button'
      data-button-type='include'
      onclick="window.setChatRelation(event=this, relation='include')"
    >
      <!-- plus black -->
      <img src="../img/svg/plus-black.svg" />
    </button>
    <button
      class='button'
      data-button-type='exclude'
      onclick="window.setChatRelation(event=this, relation='exclude')"
    >
      <!-- minus black -->
      <img src="../img/svg/minus-black.svg" />
    </button>`;

    window.setChatRelation = async function(event, relation) {
      let tdElement = event.parentElement.parentElement;
      let buttonsElement = event.parentElement;
      
      let folderId = tdElement.getAttribute("data-folder-id");
      let chatId = tdElement.getAttribute("data-chat-id");

      const a = await eel.set_chat_folder_relation(
        Number(chatId),
        Number(folderId),
        relation,
      )();

        console.log(relation)

      if (a.success) {
        let buttons = buttonsElement.querySelectorAll('button')

        buttons.forEach(item => {
          let buttonType = item.getAttribute('data-button-type')

          if (relation === buttonType) {
            if (buttonType === 'pinned') {
              item.innerHTML = /* html */ `
                <img src="../img/svg/pin-white.svg" />
              `
            } else if (buttonType === 'include') {
              item.innerHTML = /* html */ `
                <img src="../img/svg/plus-white.svg" />
              `
            } else if (buttonType === 'exclude') {
              item.innerHTML = /* html */ `
                <img src="../img/svg/minus-white.svg" />
              `
            }
          }

          if (relation !== buttonType) {
            if (buttonType === 'pinned') {
              item.innerHTML = /* html */ `
                <img src="../img/svg/pin-black.svg" />
              `
            } else if (buttonType === 'include') {
              item.innerHTML = /* html */ `
                <img src="../img/svg/plus-black.svg" />
              `
            } else if (buttonType === 'exclude') {
              item.innerHTML = /* html */ `
                <img src="../img/svg/minus-black.svg" />
              `
            }
          }

          
        })
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
  `,
    );

    window.flagsOnClick = async function(event) {
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
                <img src="../img/svg/minus-black.svg" />
              </button>
            </div>
          `;
          } else {
            event.innerHTML = /* html */ `
            <div class='buttons'>
              <button class='button'>
              <!-- plus black -->
              <img src="../img/svg/plus-black.svg" />
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
                <img src="../img/svg/minus-white.svg" />
              </button>
            </div>
          `;
          } else {
            event.innerHTML = /* html */ `
            <div class='buttons'>
              <button class='button'>
                <!-- plus white -->
                <img src="../img/svg/plus-white.svg" />
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
                <!-- <img src="../img/svg/pin-white.svg" /> -->
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
                  ${setChatsButtons()}
                </div>
              </td>
            `;
        })
        .join("")}
        </tr>
      `,
    );
  });
}

export { load };
