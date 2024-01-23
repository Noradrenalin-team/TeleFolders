async function loadFolders() {
  const response = await eel.get_folders()();
  const tableElement = document.querySelector(".table thead tr");
  tableElement.textContent = ''
  const tbodyElement = document.querySelector(".table tbody");
  tbodyElement.textContent = "";

  tableElement.insertAdjacentHTML(
    "beforeend",
    /* html */ `
      <th>Все чаты</th>
    `
  );

  response.map((value) => {
    tableElement.insertAdjacentHTML(
      "beforeend",
      /* html */ `
        <th>${value.folder_title}</th>
      `
    );
  });

  tableElement.insertAdjacentHTML(
    "beforeend",
    /* html */ `
    <th id='add-folder'>+</th>
  `
  );

  document.getElementById("add-folder").addEventListener("click", () => {
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
  });

  loadChats();
}

async function loadChats() {
  const chats = await eel.get_all_chats()();
  console.log(chats);
  const folders = await eel.get_folders()();
  console.log(folders);
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
    ? /* html */`<button class='button ${folder.flags[folderFlag] ? 'green-button' : ''}'>
    <svg viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>minus-circle</title> <desc>Created with Sketch Beta.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage"> <g id="Icon-Set-Filled" sketch:type="MSLayerGroup" transform="translate(-518.000000, -1089.000000)" fill="#000000"> <path d="M540,1106 L528,1106 C527.447,1106 527,1105.55 527,1105 C527,1104.45 527.447,1104 528,1104 L540,1104 C540.553,1104 541,1104.45 541,1105 C541,1105.55 540.553,1106 540,1106 L540,1106 Z M534,1089 C525.163,1089 518,1096.16 518,1105 C518,1113.84 525.163,1121 534,1121 C542.837,1121 550,1113.84 550,1105 C550,1096.16 542.837,1089 534,1089 L534,1089 Z" id="minus-circle" sketch:type="MSShapeGroup"> </path> </g> </g> </g></svg>
    </button>`
    : /* html */`<button class='button ${folder.flags[folderFlag] ? 'green-button' : ''}'>
  <svg viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>plus-circle</title> <desc>Created with Sketch Beta.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage"> <g id="Icon-Set-Filled" sketch:type="MSLayerGroup" transform="translate(-466.000000, -1089.000000)" fill="#000000"> <path d="M488,1106 L483,1106 L483,1111 C483,1111.55 482.553,1112 482,1112 C481.447,1112 481,1111.55 481,1111 L481,1106 L476,1106 C475.447,1106 475,1105.55 475,1105 C475,1104.45 475.447,1104 476,1104 L481,1104 L481,1099 C481,1098.45 481.447,1098 482,1098 C482.553,1098 483,1098.45 483,1099 L483,1104 L488,1104 C488.553,1104 489,1104.45 489,1105 C489,1105.55 488.553,1106 488,1106 L488,1106 Z M482,1089 C473.163,1089 466,1096.16 466,1105 C466,1113.84 473.163,1121 482,1121 C490.837,1121 498,1113.84 498,1105 C498,1096.16 490.837,1089 482,1089 L482,1089 Z" id="plus-circle" sketch:type="MSShapeGroup"> </path> </g> </g> </g></svg>
</button>`;
    return result;
  }

  function setChatsButtons() {
    let result = /* html */`
    <button class='button'>
      <svg viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>plus-circle</title> <desc>Created with Sketch Beta.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage"> <g id="Icon-Set-Filled" sketch:type="MSLayerGroup" transform="translate(-466.000000, -1089.000000)" fill="#000000"> <path d="M488,1106 L483,1106 L483,1111 C483,1111.55 482.553,1112 482,1112 C481.447,1112 481,1111.55 481,1111 L481,1106 L476,1106 C475.447,1106 475,1105.55 475,1105 C475,1104.45 475.447,1104 476,1104 L481,1104 L481,1099 C481,1098.45 481.447,1098 482,1098 C482.553,1098 483,1098.45 483,1099 L483,1104 L488,1104 C488.553,1104 489,1104.45 489,1105 C489,1105.55 488.553,1106 488,1106 L488,1106 Z M482,1089 C473.163,1089 466,1096.16 466,1105 C466,1113.84 473.163,1121 482,1121 C490.837,1121 498,1113.84 498,1105 C498,1096.16 490.837,1089 482,1089 L482,1089 Z" id="plus-circle" sketch:type="MSShapeGroup"> </path> </g> </g> </g></svg>
    </button>
    <button class='button'>
      <svg viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>minus-circle</title> <desc>Created with Sketch Beta.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage"> <g id="Icon-Set-Filled" sketch:type="MSLayerGroup" transform="translate(-518.000000, -1089.000000)" fill="#000000"> <path d="M540,1106 L528,1106 C527.447,1106 527,1105.55 527,1105 C527,1104.45 527.447,1104 528,1104 L540,1104 C540.553,1104 541,1104.45 541,1105 C541,1105.55 540.553,1106 540,1106 L540,1106 Z M534,1089 C525.163,1089 518,1096.16 518,1105 C518,1113.84 525.163,1121 534,1121 C542.837,1121 550,1113.84 550,1105 C550,1096.16 542.837,1089 534,1089 L534,1089 Z" id="minus-circle" sketch:type="MSShapeGroup"> </path> </g> </g> </g></svg>
    </button>`;
    return result;
  }

  Object.keys(folders[0].flags).map((value) => {    
    tbodyElement.insertAdjacentHTML(
      "beforeend",
      /* html */ `
      <tr>
        <td>${setName(value)}</td>
        ${folders.map((folder) => {
          console.log(folder.folder_id)
          return /* html */ `
        <td
          data-flag="${value}"
          data-flag-state="${folders[0].flags[value]}"
          data-folder-id="${folder.folder_id}"
          onclick="window.flagsOnClick(this)"
        ><div class='buttons'>${setFlugsButton(folder, value)}</div></td>
      `;
        }).join('')}
      </tr>
  `
    );

    window.flagsOnClick = async function(event) {
      let folderId = event.getAttribute('data-folder-id');
      let flag = event.getAttribute('data-flag');
      let value = event.getAttribute('data-flag-state') === 'true' ? true : false;

      let a = await eel.set_folder_flag(Number(folderId), flag, !value)()

      if (a.success === true) {
        event.setAttribute('data-flag-state', !value);
        if (value) {
          event.querySelector('.button').classList.remove('green-button')
        } else {
          event.querySelector('.button').classList.add('green-button')
        }
      }
    }
  });

  chats.map((value) => {
    tbodyElement.insertAdjacentHTML(
      "beforeend",
      /* html */ `
      <tr>
        <td data-chat-id="${value.chat_id}">${value.title}</td>
        ${folders.map((folder) => {
          return /* html */ `
            <td
              class="tdButtons"
              data-chat-id="${value.chat_id}"
              data-folder-id="${folder.folder_id}"
            ><div class="buttons">${setChatsButtons()}</div></td>
          `;
        }).join('')}
      </tr>
  `
    );
  });
}

export { loadFolders, loadChats };
