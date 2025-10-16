from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

from ..utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class LinkedInClient:
    driver: WebDriver
    slowmo_ms: int = 0

    def _sleep(self) -> None:
        if self.slowmo_ms > 0:
            time.sleep(self.slowmo_ms / 1000.0)

    def open_home(self) -> None:
        logger.info("Opening LinkedIn home page")
        self.driver.get("https://www.linkedin.com/")
        self._sleep()

    def is_logged_in(self) -> bool:
        # Placeholder heuristic; will be improved later
        url = self.driver.current_url
        return "feed" in url or "linkedin.com" in url

    def login(self, username: Optional[str], password: Optional[str]) -> None:
        # Placeholder; implement properly later
        logger.info("Login placeholder invoked (non-functional)")
        self._sleep()

    def send_connection_request_placeholder(self, profile_url: str) -> None:
        logger.info("Navigate to profile: %s", profile_url)
        self.driver.get(profile_url)
        self._sleep()
        # Placeholder – real selectors and flow to be implemented later
        logger.info("Connection request placeholder – no action taken")
        self._sleep()
