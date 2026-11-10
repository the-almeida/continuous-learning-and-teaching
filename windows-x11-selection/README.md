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

- **The script never sends Ctrl+C to a terminal.** This covers Windows Terminal, conhost, PowerShell, cmd, WSL, mintty, Alacritty, WezTerm and the others in the list. Without an active selection, Ctrl+C interrupts the running process.
- **In terminals:** a mouse selection is copied with **Ctrl+Insert**, and a middle click pastes the selection buffer with **Shift+Insert**. Neither shortcut ever sends an interrupt. The middle click is never passed through, because terminals turn it into autoscroll. Keyboard selection (Ctrl+A, Shift+arrows) is off there, since those keys edit the command line.
- **Apps with an embedded terminal** (the Claude app, VS Code, Cursor, JetBrains IDEs) also use Ctrl+Insert / Shift+Insert.
- **Arrow cursor over text:** some apps (e.g. the Claude desktop chat) show the arrow over selectable text. Arrow-cursor drags count as selections as long as they don't move the window. A selection is only kept when the copy yields text, so dragged files never fill the buffer.
- **Debugging:** set `MODO_DEPURACAO := true` to log metadata only (app, cursor, method, success, length; never the text) to `%TEMP%\selecao-debug.log`.

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
