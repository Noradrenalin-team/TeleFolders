import eel
import argparse
import os

from . import eel_functions  # noqa


def set_env_vars():
    parser = argparse.ArgumentParser(
        description="Set TELEFOLDERS_API_ID and TELEFOLDERS_API_HASH"
    )
    parser.add_argument("--api_id", required=False, help="API ID for Telefolders")
    parser.add_argument("--api_hash", required=False, help="API Hash for Telefolders")

    args = parser.parse_args()

    if args.api_id is None or args.api_hash is None:
        return

    os.environ["TELEFOLDERS_API_ID"] = args.api_id
    os.environ["TELEFOLDERS_API_HASH"] = args.api_hash


def main():
    eel.init(os.path.join(os.path.dirname(os.path.realpath(__file__)), "web"))
    eel.start("main.html", mode="default")


if __name__ == "__main__":
    set_env_vars()
    main()
