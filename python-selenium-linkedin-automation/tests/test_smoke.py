from __future__ import annotations

import os

from linkedin_automation.config.settings import AppSettings


def test_settings_defaults():
    # Ensure defaults load without .env
    settings = AppSettings.from_env()
    assert settings.browser in {"chrome", "firefox"}
    assert isinstance(settings.headless, bool)
    assert settings.page_load_timeout_sec > 0


def test_env_overrides(monkeypatch):
    monkeypatch.setenv("BROWSER", "firefox")
    monkeypatch.setenv("HEADLESS", "false")
    monkeypatch.setenv("SLOWMO_MS", "10")
    monkeypatch.setenv("PAGELOAD_TIMEOUT_SEC", "5")
    s = AppSettings.from_env()
    assert s.browser == "firefox"
    assert s.headless is False
    assert s.slowmo_ms == 10
    assert s.page_load_timeout_sec == 5
