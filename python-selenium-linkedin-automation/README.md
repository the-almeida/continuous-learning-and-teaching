# Python Selenium LinkedIn Automation

Automated LinkedIn connection workflows using Python and Selenium. This repository currently contains a clean, well-structured boilerplate to start safely and incrementally. It includes a CLI scaffold, Selenium browser factory, config management, logging utilities, and a placeholder LinkedIn client.

Important: Use responsibly. Automating 3rd‑party services may violate their Terms of Service. Proceed at your own risk, respect rate limits, and comply with all applicable laws and platform policies.

## Quickstart

- Prerequisites:
  - Python 3.10+
  - Chrome or Firefox installed (headless supported)
- Setup:
  - From this directory:
    ```bash
    make install
    ```
- Try the CLI:
  ```bash
  make run        # shows CLI help
  make smoke      # smoke-check the CLI and config
  ```

## Project Structure

```
python-selenium-linkedin-automation/
├─ src/
│  └─ linkedin_automation/
│     ├─ __init__.py
│     ├─ __main__.py
│     ├─ cli.py
│     ├─ config/
│     │  └─ settings.py
│     ├─ core/
│     │  └─ browser.py
│     ├─ clients/
│     │  └─ linkedin.py
│     └─ utils/
│        └─ logger.py
├─ tests/
│  └─ test_smoke.py
├─ .env.example
├─ .gitignore
├─ Makefile
├─ pyproject.toml
├─ requirements.txt
└─ requirements-dev.txt
```

## Environment Variables

Copy `.env.example` to `.env` and set values as needed.

- `LINKEDIN_USERNAME`: LinkedIn email/username (optional for now)
- `LINKEDIN_PASSWORD`: LinkedIn password (optional for now)
- `BROWSER`: `chrome` or `firefox` (default: `chrome`)
- `HEADLESS`: `true` or `false` (default: `true`)
- `SLOWMO_MS`: artificial delay in milliseconds between actions (default: `0`)
- `PAGELOAD_TIMEOUT_SEC`: page load timeout (default: `30`)

## Development

- Install dependencies:
  ```bash
  make install
  ```
- Lint and format:
  ```bash
  make lint
  make format
  ```
- Run tests:
  ```bash
  make test
  ```

## Notes on WebDrivers

This project uses `webdriver-manager` to download and manage the appropriate browser drivers automatically. You can override driver behavior via environment variables or pass custom options in `core/browser.py` as needed.

## Roadmap

- Implement interactive login and session persistence
- Implement search and connection flows (rate-limited, human-like pacing)
- Add robust error handling and retries
- Add Dockerfile and CI
- Extend test coverage with mocks for Selenium

## Disclaimer

This project is for educational purposes. You are solely responsible for compliance with LinkedIn's Terms of Service and any applicable laws and regulations. Use conservatively to avoid account risk.
