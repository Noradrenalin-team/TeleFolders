import eel

from .tg import Telefolders


telefolders = Telefolders()


@eel.expose
def init():
    return telefolders.init()


@eel.expose
def login_phone(phone):
    return telefolders.login_phone(phone)


@eel.expose
def login_code(phone, code):
    return telefolders.login_code(phone, code)


@eel.expose
def login_password(phone, password, phone_code_hash):
    return telefolders.login_password(phone, password, phone_code_hash)


@eel.expose
def set_chat_archive(chat_id, archive):
    print(chat_id, archive)
    return telefolders.set_chat_archive(chat_id, archive)


@eel.expose
def logout():
    return telefolders.logout()


@eel.expose
def get_user():
    return telefolders.get_user()


@eel.expose
def get_folders():
    return telefolders.get_folders()


@eel.expose
def get_all_chats():
    return telefolders.get_all_chats()


@eel.expose
def set_chat_pin(chat_id, pin):
    return telefolders.set_chat_pin(chat_id, pin)


@eel.expose
def set_chat_folder_relation(chat_id, folder_id, relation=None):
    return telefolders.set_chat_folder_relation(chat_id, folder_id, relation)


@eel.expose
def set_folder_flag(folder_id, flag, value):
    return telefolders.set_folder_flag(folder_id, flag, value)
