PYTHON ?= python3
PIP ?= pip3

VENV ?= .venv
ACTIVATE = $(VENV)/bin/activate

.PHONY: help install dev test lint format run smoke clean

help:
	@echo "Targets: install, dev, test, lint, format, run, smoke, clean"

$(VENV):
	$(PYTHON) -m venv $(VENV)
	. $(ACTIVATE); $(PIP) install --upgrade pip wheel

install: $(VENV)
	. $(ACTIVATE); $(PIP) install -r requirements.txt -r requirements-dev.txt

run:
	. $(ACTIVATE); $(PYTHON) -m linkedin_automation --help

info:
	. $(ACTIVATE); $(PYTHON) -m linkedin_automation info

smoke:
	. $(ACTIVATE); $(PYTHON) -m pytest -q tests/test_smoke.py

lint:
	. $(ACTIVATE); ruff check src

format:
	. $(ACTIVATE); black src tests

test:
	. $(ACTIVATE); pytest -vv -ra

clean:
	rm -rf $(VENV) .pytest_cache .ruff_cache __pycache__ .mypy_cache htmlcov .coverage

