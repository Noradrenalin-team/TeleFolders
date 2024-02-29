import telethon
from telethon import TelegramClient, sync  # noqa
from telethon.tl.functions.messages import GetDialogFiltersRequest
from telethon.tl.functions.messages import UpdateDialogFilterRequest
from telethon import errors
from telethon.tl.types import DialogFilter

from rich import print


import os


class Telefolders:
    def __init__(self):
        self.client: TelegramClient = None

    def init(self):
        # from https://my.telegram.org, under API Development.
        api_id = os.environ.get("TELEFOLDERS_API_ID")
        api_hash = os.environ.get("TELEFOLDERS_API_HASH")

        try:
            self.client = TelegramClient(
                "telefolders", api_id, api_hash, lang_code="ru"
            )
            self.client.connect()

            if self.client.is_user_authorized():
                return {"success": True, "authorized": True}
            else:
                return {"success": True, "authorized": False}
        except Exception as e:
            return {"success": False, "error": str(e), "error_code": "unknown"}

    def login_phone(self, phone):
        try:
            print(phone)
            r = self.client.send_code_request(phone)
            return {"success": True, "phone_code_hash": r.phone_code_hash}
        except Exception as e:
            return {"success": False, "error": str(e), "error_code": "unknown"}

    def login_code(self, phone, code):
        try:
            print(phone, code)
            self.client.sign_in(phone, code)
            return {"success": True, "need_password": False, "user": self.get_user()}
        except errors.rpcerrorlist.SessionPasswordNeededError:
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

    def login_password(self, phone, password, phone_code_hash):
        try:
            print(phone, password, phone_code_hash)
            self.client.sign_in(
                phone, password=password, phone_code_hash=phone_code_hash
            )
            return {"success": True, "user": self.get_user()}

        except Exception as e:
            return {"success": False, "error": str(e), "error_code": "unknown"}

    def logout(self):
        try:
            self.client.log_out()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e), "error_code": "unknown"}

    def get_user(self):
        me = self.client.get_me()
        return (
            {
                "username": me.username,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "picture": self.client.download_profile_photo("me", file=bytes),
                "id": me.id,
            }
            if self.client.is_user_authorized()
            else None
        )

    def get_folders(self):
        folders = self.client(GetDialogFiltersRequest())

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

    def get_all_chats(self):
        chats_with_folders = {}

        for folder in self.client(GetDialogFiltersRequest()):
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
                    chats_with_folders[chat_id]["include"].append(folder.id)

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
                    chats_with_folders[chat_id]["exclude"].append(folder.id)

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
                    chats_with_folders[chat_id]["pinned"].append(folder.id)

        ans = []

        for chat in self.client.iter_dialogs():
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
        return ans

    def set_chat_pin(self, chat_id, pin: bool = True):
        return {
            "success": False,
            "error": "Not implemented yet",
            "error_code": "not_implemented",
        }

    def set_chat_archive(self, chat_id, archive: bool = True):
        if archive:
            self.client.edit_folder(chat_id, 1)
            return {"success": True}
        else:
            self.client.edit_folder(chat_id, 0)
            return {"success": True}

    def set_chat_folder_relation(self, chat_id, folder_id, relation=None):
        folders = self.client(GetDialogFiltersRequest())

        for folder_ in folders:
            if "id" in folder_.__dict__ and folder_.id == folder_id:
                folder = folder_
                break

        entity = self.client.get_input_entity(
            telethon.utils.get_peer(self.client.get_entity(chat_id))
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

        try:
            self.client(UpdateDialogFilterRequest(folder.id, folder))
        except telethon.errors.rpcerrorlist.FilterIncludeEmptyError:
            return {
                "success": False,
                "error": "The include_peers vector of the filter is empty",
                "error_code": "folder_empty_error",
            }
        return {"success": True}

    def set_folder_flag(self, folder_id, flag, value):
        folders = self.client(GetDialogFiltersRequest())
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
            return {
                "success": False,
                "error": "Unknown flag",
                "error_code": "unknown_flag",
            }

        try:
            self.client(UpdateDialogFilterRequest(folder.id, folder))
        except telethon.errors.rpcerrorlist.FilterIncludeEmptyError:
            return {
                "success": False,
                "error": "The include_peers vector of the filter is empty",
                "error_code": "folder_empty_error",
            }

        return {"success": True}
