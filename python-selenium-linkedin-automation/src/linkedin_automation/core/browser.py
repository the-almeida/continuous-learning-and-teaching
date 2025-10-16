from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.firefox.service import Service as FirefoxService
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager

from ..config.settings import AppSettings
from ..utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class BrowserContext:
    driver: webdriver.Remote

    def close(self) -> None:
        try:
            self.driver.quit()
        except Exception:
            logger.exception("Error while closing WebDriver")


class BrowserFactory:
    @staticmethod
    def create(settings: Optional[AppSettings] = None) -> BrowserContext:
        settings = settings or AppSettings.from_env()
        if settings.browser == "firefox":
            options = FirefoxOptions()
            options.headless = settings.headless
            service = FirefoxService(executable_path=GeckoDriverManager().install())
            driver = webdriver.Firefox(service=service, options=options)
        else:
            options = ChromeOptions()
            if settings.headless:
                options.add_argument("--headless=new")
            options.add_argument("--disable-gpu")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            service = ChromeService(executable_path=ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=options)

        driver.set_page_load_timeout(settings.page_load_timeout_sec)
        return BrowserContext(driver=driver)
