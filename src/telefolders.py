import rich
from telethon import TelegramClient, events, sync
import telethon
from telethon.tl.functions.messages import GetDialogFiltersRequest
from telethon.tl.functions.messages import UpdateDialogFilterRequest
from telethon.tl.types import InputPeerUser
from telethon import errors
from telethon.tl.types import DialogFilter
from telethon.tl.custom.dialog import Dialog

from rich import print

# api_hash from https://my.telegram.org, under API Development.
api_id = 17583130
api_hash = "0779564a33367691b08608d818442f40"

client = TelegramClient("telefolders_session_name", api_id, api_hash, lang_code="ru")
# client.start()
client.connect()


def login_phone(phone):
    try:
        print(phone)
        r = client.send_code_request(phone)
        return {"success": True, "phone_code_hash": r.phone_code_hash}
    except Exception as e:
        return {"success": False, "error": str(e), "error_code": "unknown"}


def login_code(phone, code):
    try:
        print(phone, code)
        r = client.sign_in(phone, code)
        return {"success": True, "need_password": False, "user": get_user()}
    except errors.rpcerrorlist.SessionPasswordNeededError as e:
        return {
            "success": True,
            "need_password": True,
            "user": None,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "need_password": False,
            "error_code": "unknown",
        }


def login_password(phone, password, phone_code_hash):
    try:
        print(phone, password, phone_code_hash)
        client.sign_in(phone, password=password, phone_code_hash=phone_code_hash)
        return {"success": True, "user": get_user()}

    except Exception as e:
        return {"success": False, "error": str(e), "error_code": "unknown"}


def logout():
    try:
        client.log_out()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e), "error_code": "unknown"}


def get_user():
    return (
        {
            "username": client.get_me().username,
            "first_name": client.get_me().first_name,
            "last_name": client.get_me().last_name,
            "picture": client.download_profile_photo("me", file=bytes),
        }
        if client.is_user_authorized()
        else None
    )


def get_folders():
    folders = client(GetDialogFiltersRequest())

    ans = []

    for folder in folders:
        if type(folder) == DialogFilter:
            ans.append(
                {
                    "folder_id": folder.id,
                    "folder_title": folder.title,
                    "folder_icon": folder.emoticon,
                    "flags": {
                        "contacts": folder.contacts,
                        "non_contacts": folder.non_contacts,
                        "groups": folder.groups,
                        "broadcasts": folder.broadcasts,
                        "bots": folder.bots,
                        "exclude_muted": folder.exclude_muted,
                        "exclude_read": folder.exclude_read,
                        "exclude_archived": folder.exclude_archived,
                    },
                }
            )

    return ans


def get_all_chats():
    import time

    now = time.time()

    chats_with_folders = {}

    for folder in client(GetDialogFiltersRequest()):
        if type(folder) == DialogFilter:
            include_chats = folder.include_peers
            exclude_chats = folder.exclude_peers
            pinned_chats = folder.pinned_peers

            for chat in include_chats:
                if "channel_id" in chat.__dict__:
                    chat_id = chat.channel_id
                elif "user_id" in chat.__dict__:
                    chat_id = chat.user_id
                elif "chat_id" in chat.__dict__:
                    chat_id = chat.chat_id
                else:
                    print(chat)
                    continue
                if chat_id not in chats_with_folders:
                    chats_with_folders[chat_id] = {
                        "include": [],
                        "exclude": [],
                        "pinned": [],
                    }
                chats_with_folders[chat_id]["include"].append(folder.title)

            for chat in exclude_chats:
                if "channel_id" in chat.__dict__:
                    chat_id = chat.channel_id
                elif "user_id" in chat.__dict__:
                    chat_id = chat.user_id
                elif "chat_id" in chat.__dict__:
                    chat_id = chat.chat_id
                else:
                    print(chat)
                    continue
                if chat_id not in chats_with_folders:
                    chats_with_folders[chat_id] = {
                        "include": [],
                        "exclude": [],
                        "pinned": [],
                    }
                chats_with_folders[chat_id]["exclude"].append(folder.title)

            for chat in pinned_chats:
                if "channel_id" in chat.__dict__:
                    chat_id = chat.channel_id
                elif "user_id" in chat.__dict__:
                    chat_id = chat.user_id
                elif "chat_id" in chat.__dict__:
                    chat_id = chat.chat_id
                else:
                    print(chat)
                    continue
                if chat_id not in chats_with_folders:
                    chats_with_folders[chat_id] = {
                        "include": [],
                        "exclude": [],
                        "pinned": [],
                    }
                chats_with_folders[chat_id]["pinned"].append(folder.title)

    # return chats_with_folders

    ans = []

    for chat in client.iter_dialogs():
        peer_id = chat.entity.id
        ans.append(
            {
                "chat_id": chat.id,
                "peer_id": peer_id,
                "pinned": chat.pinned,
                # "picture": client.download_profile_photo(chat, file=bytes),
                "title": chat.title,
                "archived": chat.archived,
                "folders": chats_with_folders.get(
                    peer_id, {"include": [], "exclude": [], "pinned": []}
                ),
            }
        )

    print(len(ans))

    print(time.time() - now)
    return ans


def set_chat_pin(chat_id, pin: bool = True):
    return {
        "success": False,
        "error": "Not implemented yet",
        "error_code": "not_implemented",
    }
    # dialogs = client.iter_dialogs()

    # # dialogs = client.get_dialogs()

    # dialog = None

    # for dialog in dialogs:
    #     if dialog.id == chat_id:
    #         chat = dialog
    #         break

    # if chat is None:
    #     return {
    #         "success": False,
    #         "error": "Chat not found",
    #         "error_code": "chat_not_found",
    #     }

    # if chat.pinned == pin:
    #     return {
    #         "success": False,
    #         "error": "Chat already pinned",
    #         "error_code": "chat_already_pinned",
    #     }

    # dialog.pinned = pin


def set_chat_archive(chat_id, archive):
    if archive:
        client.edit_folder(chat_id, 1)
    else:
        client.edit_folder(chat_id, 0)


def set_chat_folder_relation(chat_id, folder_id, relation=None):
    folders = client(GetDialogFiltersRequest())

    for folder_ in folders:
        if "id" in folder_.__dict__ and folder_.id == folder_id:
            folder = folder_
            break

    entity = client.get_input_entity(
        telethon.utils.get_peer(client.get_entity(chat_id))
    )

    if relation == "include":
        if entity in folder.exclude_peers:
            folder.exclude_peers.remove(entity)
        if entity in folder.pinned_peers:
            folder.pinned_peers.remove(entity)
        folder.include_peers.append(entity)
    elif relation == "exclude":
        if entity in folder.include_peers:
            folder.include_peers.remove(entity)
        if entity in folder.pinned_peers:
            folder.pinned_peers.remove(entity)
        folder.exclude_peers.append(entity)
    elif relation == "pinned":
        if entity in folder.include_peers:
            folder.include_peers.remove(entity)
        if entity in folder.exclude_peers:
            folder.exclude_peers.remove(entity)
        folder.pinned_peers.append(entity)
    else:
        if entity in folder.include_peers:
            folder.include_peers.remove(entity)
        if entity in folder.exclude_peers:
            folder.exclude_peers.remove(entity)

    client(UpdateDialogFilterRequest(folder.id, folder))

    return {"success": True}


def set_folder_flag(folder_id, flag, value):
    folders = client(GetDialogFiltersRequest())
    print(folder_id, flag, value)

    for folder_ in folders:
        if "id" in folder_.__dict__ and folder_.id == folder_id:
            folder = folder_
            break

    value = bool(value)

    if flag == "contacts":
        folder.contacts = value
    elif flag == "non_contacts":
        folder.non_contacts = value
    elif flag == "groups":
        folder.groups = value
    elif flag == "broadcasts":
        folder.broadcasts = value
    elif flag == "bots":
        folder.bots = value
    elif flag == "exclude_muted":
        folder.exclude_muted = value
    elif flag == "exclude_read":
        folder.exclude_read = value
    elif flag == "exclude_archived":
        folder.exclude_archived = value
    else:
        return {"success": False, "error": "Unknown flag", "error_code": "unknown_flag"}

    try:
        client(UpdateDialogFilterRequest(folder.id, folder))
    except telethon.errors.rpcerrorlist.FilterIncludeEmptyError as e:
        return {
            "success": False,
            "error": "The include_peers vector of the filter is empty",
            "error_code": "folder_empty_error",
        }

    return {"success": True}


if __name__ == "__main__":
    # print(get_user())

    # print(get_folders())

    # print(get_all_chats())

    # print(set_chat_archive(-1001275444990, False))

    # print(set_chat_folder_relation(-1001275444990, 5, "include"))

    # print(set_folder_flag(5, "contacts", False))
    pass
