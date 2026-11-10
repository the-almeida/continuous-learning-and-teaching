#Requires AutoHotkey v2.0
#SingleInstance Force
Persistent

; =============================================================================
; Seleção estilo Linux/X11 no Windows
;
;   - Selecionar texto (arrastar, duplo ou triplo clique) guarda o texto num
;     buffer PRÓPRIO do script, separado do Ctrl+C.
;   - Clique do meio sobre um campo de texto cola esse buffer.
;   - Seu Ctrl+C / Ctrl+V continua intacto: o script troca a área de
;     transferência por um instante e devolve o conteúdo original.
;
; Atalho: Ctrl+Alt+M liga/desliga o script.
;
; Limitação: o Windows só tem UMA área de transferência, então o histórico do
; Win+V (se você usa) vai registrar as trocas momentâneas.
; =============================================================================

; --- Configuração ------------------------------------------------------------

; Terminais: o script NUNCA manda Ctrl+C neles (pode interromper o processo
; rodando). Seleção com o mouse é copiada com Ctrl+Insert, o clique do meio
; cola com Shift+Insert, e a seleção pelo teclado (Ctrl+A, Shift+setas) fica
; desligada porque nos terminais esses atalhos editam a linha de comando.
TERMINAIS := [
    "WindowsTerminal.exe", "OpenConsole.exe", "conhost.exe", "cmd.exe",
    "powershell.exe", "pwsh.exe", "wsl.exe", "bash.exe", "mintty.exe",
    "alacritty.exe", "wezterm-gui.exe", "Hyper.exe", "Tabby.exe",
    "ConEmu.exe", "ConEmu64.exe", "putty.exe", "kitty.exe", "MobaXterm.exe",
    "Warp.exe"
]

; Apps que têm um terminal embutido (app do Claude, VS Code, Cursor, IDEs da
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
A_IconTip := "Seleção → clique do meio (Ctrl+Alt+M liga/desliga)"

; --- Captura da seleção ------------------------------------------------------

global cursorNoInicio := "", janelaNoInicio := 0, posJanelaNoInicio := ""

~LButton:: {
    global downX, downY, cursorNoInicio, janelaNoInicio, posJanelaNoInicio
    MouseGetPos(&downX, &downY, &janelaNoInicio)
    cursorNoInicio := A_Cursor
    posJanelaNoInicio := PosicaoDaJanela(janelaNoInicio)
}

~LButton Up:: {
    global ultimoSoltar, contagemCliques
    MouseGetPos(&x, &y, &win)
    exe := ProcessoDaJanela(win)
    ; Terminais entram aqui também: neles a cópia usa Ctrl+Insert, que é
    ; "copiar" no Windows Terminal e no console clássico e nunca manda
    ; "interromper" para o processo (ver CopiarSelecao).
    if (exe = "" || NaLista(IGNORAR, exe))
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

    ; É seleção de texto quando o cursor é o "I" de texto (no começo ou no
    ; fim), ou quando é a seta comum num arraste que não moveu a janela.
    ; Alguns apps (ex.: o chat do app do Claude) mostram a seta sobre texto
    ; selecionável. Cursores de redimensionar, mão (links) etc. ficam de fora,
    ; e arrastar a janela pela barra de título é descartado porque a
    ; posição dela muda. Arquivos arrastados são filtrados depois: só vale
    ; se a cópia trouxer texto.
    ehTexto := A_Cursor = "IBeam" || cursorNoInicio = "IBeam"
    ehSetaParada := arrastou && cursorNoInicio = "Arrow" && A_Cursor = "Arrow"
        && PosicaoDaJanela(janelaNoInicio) = posJanelaNoInicio
    if !(ehTexto || ehSetaParada) {
        Depurar("ignorado exe=" exe " cursorInicio=" cursorNoInicio " cursorFim=" A_Cursor " arrastou=" arrastou " cliques=" contagemCliques)
        return
    }

    ; Pequena espera para o app terminar de aplicar a seleção.
    SetTimer(() => CopiarSelecao(exe), -40)
}

; --- Seleção pelo teclado (Ctrl+A, Shift+setas/Home/End/PgUp/PgDn) ---------

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

; A seleção com Shift só é copiada quando você solta o Shift, para não
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

; Tempo que a seleção fica na área de transferência antes de o seu Ctrl+C
; voltar. É o que deixa o histórico do Win+V registrar cada seleção.
TEMPO_NO_HISTORICO_MS := 700

global restauracaoPendente := false
global originalPendente := ""
global textoPendente := ""

CopiarSelecao(exe) {
    global bufferSelecao, restauracaoPendente, originalPendente, textoPendente
    ; Se uma seleção anterior ainda está esperando para devolver o seu Ctrl+C,
    ; o "original" continua sendo aquele, não a seleção anterior.
    salvo := restauracaoPendente ? originalPendente : ClipboardAll()
    A_Clipboard := ""
    ; Nunca Ctrl+C em terminais (nem nos embutidos): sem seleção ativa ele
    ; interrompe o processo rodando. Ctrl+Insert é seguro.
    usaInsert := NaLista(TERMINAIS, exe) || NaLista(COM_TERMINAL_EMBUTIDO, exe)
    if usaInsert
        Send "^{Insert}"
    else
        Send "^c"
    ; CF_UNICODETEXT (13): só aceita texto. Arquivos copiados no Explorer
    ; (CF_HDROP) não viram "seleção".
    copiou := ClipWait(0.4, 1) && DllCall("IsClipboardFormatAvailable", "UInt", 13) && A_Clipboard != ""
    Depurar("copiar exe=" exe " cursor=" A_Cursor " metodo=" (usaInsert ? "ctrl+insert" : "ctrl+c") " copiou=" copiou " chars=" StrLen(A_Clipboard))
    if copiou {
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
    ; Só devolve se ninguém copiou outra coisa nesse meio-tempo (ex.: você
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

    ; Terminais: clique do meio cola o buffer de seleção com Shift+Insert
    ; (nunca manda "interromper") e nunca repassa o clique, que nos
    ; terminais ativa a rolagem automática.
    if NaLista(TERMINAIS, exe) {
        meioRepassado := false
        Depurar("meio terminal exe=" exe " buffer=" StrLen(bufferSelecao))
        if (bufferSelecao != "")
            ColarBuffer("+{Insert}")
        return
    }

    colar := bufferSelecao != ""
        && exe != ""
        && !NaLista(TERMINAIS, exe)
        && !NaLista(IGNORAR, exe)
        && A_Cursor = "IBeam"

    Depurar("meio exe=" exe " cursor=" A_Cursor " buffer=" StrLen(bufferSelecao) " colar=" colar)
    if !colar {
        ; Comportamento normal do clique do meio (abrir link em nova aba,
        ; rolagem automática, fechar aba...). Down aqui, Up no hotkey abaixo,
        ; para segurar o botão continuar funcionando.
        meioRepassado := true
        Send "{MButton down}"
        return
    }

    meioRepassado := false
    ; Posiciona o cursor de texto onde você clicou, como no Linux.
    Click
    ColarBuffer(NaLista(COM_TERMINAL_EMBUTIDO, exe) ? "+{Insert}" : "^v")
}

ColarBuffer(teclas) {
    salvo := ClipboardAll()
    A_Clipboard := bufferSelecao
    ClipWait(0.4)
    Send teclas
    Sleep 200  ; dá tempo do app ler a área de transferência
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
    ToolTip A_IsSuspended ? "Seleção → clique do meio: DESLIGADO" : "Seleção → clique do meio: LIGADO"
    SetTimer(() => ToolTip(), -1500)
}
#SuspendExempt False

; --- Utilitários -------------------------------------------------------------

; Log de diagnóstico em %TEMP%\selecao-debug.log (só metadados, nunca o
; texto copiado). Ligue com true se algo parar de funcionar em algum app.
MODO_DEPURACAO := false
Depurar(msg) {
    if MODO_DEPURACAO
        FileAppend(FormatTime(, "HH:mm:ss") " " msg "`n", A_Temp "\selecao-debug.log", "UTF-8")
}

PosicaoDaJanela(win) {
    try {
        WinGetPos(&x, &y, &w, &h, "ahk_id " win)
        return x "," y "," w "," h
    }
    catch
        return ""
}

ProcessoDaJanela(win) {
    try return WinGetProcessName("ahk_id " win)
    catch
        return ""
}

NaLista(lista, valor) {
    for item in lista
        if (item = valor)  ; '=' já ignora maiúsculas/minúsculas
            return true
    return false
}
