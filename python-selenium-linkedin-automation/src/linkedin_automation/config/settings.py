from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal

from dotenv import load_dotenv


@dataclass(frozen=True)
class AppSettings:
    browser: Literal["chrome", "firefox"] = "chrome"
    headless: bool = True
    slowmo_ms: int = 0
    page_load_timeout_sec: int = 30

    linkedin_username: str | None = None
    linkedin_password: str | None = None

    @staticmethod
    def from_env() -> "AppSettings":
        load_dotenv()  # load .env if present

        browser = os.getenv("BROWSER", "chrome").lower()
        if browser not in {"chrome", "firefox"}:
            browser = "chrome"

        headless_raw = os.getenv("HEADLESS", "true").lower()
        headless = headless_raw in {"1", "true", "yes", "y"}

        slowmo_ms = int(os.getenv("SLOWMO_MS", "0") or 0)
        page_load_timeout_sec = int(os.getenv("PAGELOAD_TIMEOUT_SEC", "30") or 30)

        linkedin_username = os.getenv("LINKEDIN_USERNAME") or None
        linkedin_password = os.getenv("LINKEDIN_PASSWORD") or None

        return AppSettings(
            browser=browser,  # type: ignore[arg-type]
            headless=headless,
            slowmo_ms=slowmo_ms,
            page_load_timeout_sec=page_load_timeout_sec,
            linkedin_username=linkedin_username,
            linkedin_password=linkedin_password,
        )

