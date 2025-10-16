from __future__ import annotations

import os
import sys
from typing import Optional

from .config.settings import AppSettings
from .utils.logger import get_logger

try:
    # Lazy import Typer if available, otherwise fallback to argparse to avoid extra dependency
    import typer

    TyperApp: Optional[object] = typer.Typer()
except Exception:  # pragma: no cover - optional dependency path
    typer = None
    TyperApp = None
    import argparse

logger = get_logger(__name__)


def _build_settings() -> AppSettings:
    return AppSettings.from_env()


if TyperApp is not None:

    app = TyperApp

    @app.command()
    def info() -> None:
        """Print active configuration and environment sanity."""
        settings = _build_settings()
        logger.info("browser=%s headless=%s", settings.browser, settings.headless)
        logger.info("timeouts: page_load=%s slowmo=%sms", settings.page_load_timeout_sec, settings.slowmo_ms)
        print("OK")

else:

    def app() -> None:
        parser = argparse.ArgumentParser(description="LinkedIn automation CLI")
        parser.add_argument("info", nargs="?", help="Show configuration")
        args = parser.parse_args()
        if args.info is not None:
            settings = _build_settings()
            logger.info("browser=%s headless=%s", settings.browser, settings.headless)
            logger.info(
                "timeouts: page_load=%s slowmo=%sms", settings.page_load_timeout_sec, settings.slowmo_ms
            )
            print("OK")
        else:
            parser.print_help()
