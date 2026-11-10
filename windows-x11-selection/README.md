# windows-x11-selection

An AutoHotkey v2 script that brings Linux/X11-style "select to copy, middle-click to paste" to Windows. The selection gets **its own buffer**, separate from Ctrl+C, like X11's PRIMARY and CLIPBOARD.

## What it does

- **Selecting text** with a mouse drag, a double or triple click, **Ctrl+A** or **Shift+arrows/Home/End/PgUp/PgDn** saves the text to the selection buffer.
- **Middle-clicking over a text field** (I-beam cursor) puts the caret there and pastes the selection buffer.
- **Your Ctrl+C / Ctrl+V clipboard is left alone.** The script borrows the Windows clipboard for a moment and then puts the original back.
- **Every selection also lands in the Win+V clipboard history.** It stays on the clipboard for about 700 ms (`TEMPO_NO_HISTORICO_MS`), long enough for the history to pick it up.
- **Middle click works as usual everywhere else**: opening a link in a new tab, closing a tab, autoscroll.
- **Ctrl+Alt+M** turns the script on and off.

## Safety around terminals

- **Terminals are skipped entirely** (Windows Terminal, conhost, PowerShell, cmd, WSL, mintty, Alacritty, WezTerm, …). Sending Ctrl+C there can interrupt a running process.
- **Apps with an embedded terminal** (the Claude app, VS Code, Cursor, JetBrains IDEs) get **Ctrl+Insert** to copy and **Shift+Insert** to paste. Those shortcuts never send an interrupt.

You can change the lists at the top of the script: `TERMINAIS`, `COM_TERMINAL_EMBUTIDO` and `IGNORAR`. The comments in the script are in Portuguese.

## Known trade-offs

- Windows has only one clipboard, so this is an emulation. A **Ctrl+V within ~700 ms of selecting** pastes the selection, not your Ctrl+C.
- If you press Ctrl+C during that window, the script notices and does **not** overwrite your copy.
- A selection only counts as text if the cursor is the I-beam. That filters out dragging windows, files and scrollbars.

## Setup

1. Install AutoHotkey v2:

   ```powershell
   winget install --id AutoHotkey.AutoHotkey -e
   ```

2. Double-click `selecao-clique-do-meio.ahk`. It starts in the tray as a green "H" icon.
3. To have it start with Windows, put a shortcut to the script in `shell:startup` (Win+R → `shell:startup`).
4. For a three-finger touchpad tap: go to Settings → Devices → Touchpad → Three-finger gestures → Taps → **Middle mouse button**.
