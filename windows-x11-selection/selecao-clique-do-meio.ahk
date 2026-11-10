#Requires AutoHotkey v2.0
#SingleInstance Force
Persistent

; =============================================================================
; SeleÃ§Ã£o estilo Linux/X11 no Windows
;
;   - Selecionar texto (arrastar, duplo ou triplo clique) guarda o texto num
;     buffer PRÃ“PRIO do script, separado do Ctrl+C.
;   - Clique do meio sobre um campo de texto cola esse buffer.
;   - Seu Ctrl+C / Ctrl+V continua intacto: o script troca a Ã¡rea de
;     transferÃªncia por um instante e devolve o conteÃºdo original.
;
; Atalho: Ctrl+Alt+M liga/desliga o script.
;
; LimitaÃ§Ã£o: o Windows sÃ³ tem UMA Ã¡rea de transferÃªncia, entÃ£o o histÃ³rico do
; Win+V (se vocÃª usa) vai registrar as trocas momentÃ¢neas.
; =============================================================================

; --- ConfiguraÃ§Ã£o ------------------------------------------------------------

; Terminais: o script nÃ£o faz NADA neles. Ctrl+C lÃ¡ dentro pode interromper o
; processo rodando, entÃ£o nem arriscamos. O clique do meio funciona normal.
TERMINAIS := [
    "WindowsTerminal.exe", "OpenConsole.exe", "conhost.exe", "cmd.exe",
    "powershell.exe", "pwsh.exe", "wsl.exe", "bash.exe", "mintty.exe",
    "alacritty.exe", "wezterm-gui.exe", "Hyper.exe", "Tabby.exe",
    "ConEmu.exe", "ConEmu64.exe", "putty.exe", "kitty.exe", "MobaXterm.exe",
    "Warp.exe"
]

; Apps que tÃªm um terminal embutido (app do Claude, VS Code, Cursor, IDEs da
; JetBrains). Neles o script usa Ctrl+Insert para copiar e Shift+Insert para
; colar: esses atalhos NUNCA mandam "interromper" para um processo.
COM_TERMINAL_EMBUTIDO := [
    "Claude.exe", "Code.exe", "Cursor.exe", "Windsurf.exe",
    "idea64.exe", "pycharm64.exe", "webstorm64.exe", "rider64.exe"
]

; Apps onde o script deve ser totalmente ignorado (ex.: jogos, Excel).
IGNORAR := []

; Quantos pixels o mouse precisa andar para contar como "arrastou".
ARRASTE_MIN_PX := 6

; --- Estado ------------------------------------------------------------------

global bufferSelecao := ""
global downX := 0, downY := 0
global ultimoSoltar := 0, contagemCliques := 0
global meioRepassado := false

CoordMode "Mouse", "Screen"
A_IconTip := "SeleÃ§Ã£o â†’ clique do meio (Ctrl+Alt+M liga/desliga)"

; --- Captura da seleÃ§Ã£o ------------------------------------------------------

~LButton:: {
    global downX, downY
    MouseGetPos(&downX, &downY)
}

~LButton Up:: {
    global ultimoSoltar, contagemCliques
    MouseGetPos(&x, &y, &win)
    exe := ProcessoDaJanela(win)
    if (exe = "" || NaLista(TERMINAIS, exe) || NaLista(IGNORAR, exe))
        return

    distancia := Abs(x - downX) + Abs(y - downY)
    agora := A_TickCount
    if (distancia < ARRASTE_MIN_PX && agora - ultimoSoltar < DllCall("GetDoubleClickTime"))
        contagemCliques += 1
    else
        contagemCliques := 1
    ultimoSoltar := agora

    arrastou := distancia >= ARRASTE_MIN_PX
    if !(arrastou || contagemCliques >= 2)
        return

    ; SÃ³ conta como seleÃ§Ã£o de texto se o cursor for o "I" de texto. Isso
    ; descarta arrastar janelas, arquivos, barras de rolagem etc.
    if (A_Cursor != "IBeam")
        return

    ; Pequena espera para o app terminar de aplicar a seleÃ§Ã£o.
    SetTimer(() => CopiarSelecao(exe), -40)
}

; --- SeleÃ§Ã£o pelo teclado (Ctrl+A, Shift+setas/Home/End/PgUp/PgDn) ---------

~^a:: AgendarCopiaDoTeclado()

global selecionouComShift := false
~+Left::
~+Right::
~+Up::
~+Down::
~+Home::
~+End::
~+PgUp::
~+PgDn::
~^+Left::
~^+Right::
~^+Home::
~^+End:: {
    global selecionouComShift
    selecionouComShift := true
}

; A seleÃ§Ã£o com Shift sÃ³ Ã© copiada quando vocÃª solta o Shift, para nÃ£o
; copiar a cada tecla.
~Shift Up:: {
    global selecionouComShift
    if !selecionouComShift
        return
    selecionouComShift := false
    AgendarCopiaDoTeclado()
}

AgendarCopiaDoTeclado() {
    win := WinExist("A")
    exe := ProcessoDaJanela(win)
    if (exe = "" || NaLista(TERMINAIS, exe) || NaLista(IGNORAR, exe))
        return
    ; Espera os modificadores serem soltos para o Ctrl+C sair limpo.
    SetTimer(() => (KeyWait("Ctrl"), KeyWait("Shift"), CopiarSelecao(exe)), -60)
}

; Tempo que a seleÃ§Ã£o fica na Ã¡rea de transferÃªncia antes de o seu Ctrl+C
; voltar. Ã‰ o que deixa o histÃ³rico do Win+V registrar cada seleÃ§Ã£o.
TEMPO_NO_HISTORICO_MS := 700

global restauracaoPendente := false
global originalPendente := ""
global textoPendente := ""

CopiarSelecao(exe) {
    global bufferSelecao, restauracaoPendente, originalPendente, textoPendente
    ; Se uma seleÃ§Ã£o anterior ainda estÃ¡ esperando para devolver o seu Ctrl+C,
    ; o "original" continua sendo aquele, nÃ£o a seleÃ§Ã£o anterior.
    salvo := restauracaoPendente ? originalPendente : ClipboardAll()
    A_Clipboard := ""
    if NaLista(COM_TERMINAL_EMBUTIDO, exe)
        Send "^{Insert}"
    else
        Send "^c"
    if (ClipWait(0.4) && A_Clipboard != "") {
        bufferSelecao := A_Clipboard
        restauracaoPendente := true
        originalPendente := salvo
        textoPendente := bufferSelecao
        SetTimer(RestaurarOriginal, -TEMPO_NO_HISTORICO_MS)
    } else {
        A_Clipboard := salvo
        restauracaoPendente := false
        originalPendente := ""
    }
}

RestaurarOriginal() {
    global restauracaoPendente, originalPendente, textoPendente
    ; SÃ³ devolve se ninguÃ©m copiou outra coisa nesse meio-tempo (ex.: vocÃª
    ; deu Ctrl+C logo depois de selecionar). '==' compara exatamente.
    if (A_Clipboard == textoPendente)
        A_Clipboard := originalPendente
    restauracaoPendente := false
    originalPendente := ""
    textoPendente := ""
}

; --- Clique do meio cola -----------------------------------------------------

MButton:: {
    global meioRepassado
    MouseGetPos(, , &win)
    exe := ProcessoDaJanela(win)
    colar := bufferSelecao != ""
        && exe != ""
        && !NaLista(TERMINAIS, exe)
        && !NaLista(IGNORAR, exe)
        && A_Cursor = "IBeam"

    if !colar {
        ; Comportamento normal do clique do meio (abrir link em nova aba,
        ; rolagem automÃ¡tica, fechar aba...). Down aqui, Up no hotkey abaixo,
        ; para segurar o botÃ£o continuar funcionando.
        meioRepassado := true
        Send "{MButton down}"
        return
    }

    meioRepassado := false
    ; Posiciona o cursor de texto onde vocÃª clicou, como no Linux.
    Click
    salvo := ClipboardAll()
    A_Clipboard := bufferSelecao
    ClipWait(0.4)
    if NaLista(COM_TERMINAL_EMBUTIDO, exe)
        Send "+{Insert}"
    else
        Send "^v"
    Sleep 200  ; dÃ¡ tempo do app ler a Ã¡rea de transferÃªncia
    A_Clipboard := salvo
    salvo := ""
}

MButton Up:: {
    global meioRepassado
    if meioRepassado {
        Send "{MButton up}"
        meioRepassado := false
    }
}

; --- Liga/desliga ------------------------------------------------------------

#SuspendExempt
^!m:: {
    Suspend -1
    ToolTip A_IsSuspended ? "SeleÃ§Ã£o â†’ clique do meio: DESLIGADO" : "SeleÃ§Ã£o â†’ clique do meio: LIGADO"
    SetTimer(() => ToolTip(), -1500)
}
#SuspendExempt False

; --- UtilitÃ¡rios -------------------------------------------------------------

ProcessoDaJanela(win) {
    try return WinGetProcessName("ahk_id " win)
    catch
        return ""
}

NaLista(lista, valor) {
    for item in lista
        if (item = valor)  ; '=' jÃ¡ ignora maiÃºsculas/minÃºsculas
            return true
    return false
}
