from __future__ import annotations

from time import localtime

import os
import sys
from typing import Any, Optional

from .config.settings import AppSettings
from .utils.logger import get_logger

typer: Optional[Any]
try:
    # Lazy import Typer if available, otherwise fallback to argparse to avoid extra dependency
    import importlib

    typer = importlib.import_module("typer")
    TyperApp: Optional[Any] = typer.Typer()
except Exception:  # pragma: no cover - optional dependency path
    typer = None
    TyperApp = None
    import argparse

logger = get_logger(__name__)


def _build_settings() -> AppSettings:
    return AppSettings.from_env()


if TyperApp is not None:

    app_typer = TyperApp

    @app_typer.command()
    def info() -> None:
        """Print active configuration and environment sanity."""
        settings = _build_settings()
        logger.info("browser=%s headless=%s", settings.browser, settings.headless)
        logger.info(
            "timeouts: page_load=%ss slowmo=%sms",
            settings.page_load_timeout_sec,
            settings.slowmo_ms,
        )
        print("CLI info: OK")

    @app_typer.command()
    def hello() -> None:
        activities = {
            8: "Sleeping",
            9: "Commuting",
            17: "Working",
            18: "Commuting",
            20: "Eating",
            22: "Resting",
        }
        time_now = localtime()
        hour = time_now.tm_hour
        for activity_time in sorted(activities.keys()):
            if hour < activity_time:
                print(
                    "Judging by the current time you should be: \033[1m\033[36m{}\033[0m".format(
                        activities[activity_time]
                    )
                )
                break
        else:
            print("Unknown, AFK or sleeping!")

        print("--------------------------------")
        """Print active configuration and environment sanity in a friendly way."""
        settings = _build_settings()
        logger.info("browser=%s headless=%s", settings.browser, settings.headless)
        logger.info(
            "timeouts: page_load=%ss slowmo=%sms",
            settings.page_load_timeout_sec,
            settings.slowmo_ms,
        )
        print("Hi Gus, the information above looks good? If yes, let's get this project started!")
        print("\n\n--------------------------------")
        print("Let's sing a song about bottles of beer!")
        print("Below some experimentational code to play with Python loops and formatting.")
        REFRAIN = """
            {} bottles of beer on the wall,
            {} bottles of beer,
            take one down, pass it around,
            {} bottles of beer on the wall!
        """
        bottles_of_beer = 9
        while bottles_of_beer > 1:
            print(REFRAIN.format(bottles_of_beer, bottles_of_beer, bottles_of_beer - 1))
            bottles_of_beer -= 1

else:

    def _argparse_app() -> None:
        parser = argparse.ArgumentParser(description="LinkedIn automation CLI")
        parser.add_argument("info", nargs="?", help="Show configuration")
        parser.add_argument("hello", nargs="?", help="Show configuration in a friendly way")
        args = parser.parse_args()
        if args.info is not None:
            settings = _build_settings()
            logger.info("browser=%s headless=%s", settings.browser, settings.headless)
            logger.info(
                "timeouts: page_load=%ss slowmo=%sms",
                settings.page_load_timeout_sec,
                settings.slowmo_ms,
            )
            print("CLI info: OK")
        if args.hello is not None:
            settings = _build_settings()
            logger.info("browser=%s headless=%s", settings.browser, settings.headless)
            logger.info(
                "timeouts: page_load=%ss slowmo=%sms",
                settings.page_load_timeout_sec,
                settings.slowmo_ms,
            )
            print(
                "Hi Gus, the information above looks good? If yes, let's get this project started!"
            )
        else:
            parser.print_help()

    app_typer = None

# Expose a single name without redefinition warnings
app = app_typer if TyperApp is not None else _argparse_app
