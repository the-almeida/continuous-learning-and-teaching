// O menu do celular é um <details> que abre em tela cheia. O foco entra no "Fechar" ao abrir, fica dentro do menu
// enquanto ele está aberto e volta ao "Menu" ao fechar, pelo botão ou pelo Esc.

// A partir desta largura o menu em tela cheia some e o menu largo aparece.
export const LARGURA_DO_MENU_LARGO = '(min-width: 76rem)';

export const focaveisDoMenu = (menu: ParentNode) => [...menu.querySelectorAll<HTMLElement>('.menu-cheio a, .menu-cheio button')];

// O Tab dá a volta dentro do menu: do último vai ao primeiro e, com Shift, do primeiro ao último. Devolve o elemento
// que deve receber o foco, ou null quando o navegador pode seguir sozinho.
export function proximoFocoPreso(focaveis: HTMLElement[], ativo: Element | null, voltando: boolean): HTMLElement | null {
	const primeiro = focaveis[0];
	const ultimo = focaveis[focaveis.length - 1];
	if (!primeiro || !ultimo) return null;
	if (voltando && ativo === primeiro) return ultimo;
	if (!voltando && ativo === ultimo) return primeiro;
	return null;
}

export function iniciarMenuCelular(raiz: Document = document): void {
	raiz.querySelectorAll<HTMLDetailsElement>('.menu-celular').forEach((menu) => {
		const fechar = menu.querySelector<HTMLElement>('.menu-fechar');
		const resumo = menu.querySelector<HTMLElement>('summary');
		if (!fechar || !resumo) return;
		// O foco volta e vai sem rolar a página: o "Menu" fica no cabeçalho fixo, e o navegador rolava até a posição dele
		// na página, tirando a pessoa do lugar.
		const fecharMenu = () => {
			menu.open = false;
			resumo.focus({ preventScroll: true });
		};
		fechar.addEventListener('click', fecharMenu);
		menu.addEventListener('toggle', () => {
			if (menu.open) fechar.focus({ preventScroll: true });
		});
		// Se a tela alarga com o menu aberto (o iPad girando, a janela maximizada), o menu em tela cheia some. Ele fecha
		// junto, para o foco não ficar preso num menu invisível.
		raiz.defaultView?.matchMedia(LARGURA_DO_MENU_LARGO).addEventListener('change', (evento) => {
			if (evento.matches && menu.open) menu.open = false;
		});
		raiz.addEventListener('keydown', (evento) => {
			if (!menu.open) return;
			if (evento.key === 'Escape') return fecharMenu();
			if (evento.key !== 'Tab') return;
			const destino = proximoFocoPreso(focaveisDoMenu(menu), raiz.activeElement, evento.shiftKey);
			if (!destino) return;
			evento.preventDefault();
			destino.focus();
		});
	});
}

// Sem isto, o menu do celular continua aberto por cima da seção depois do toque num link dele.
export function fecharMenuAoNavegar(raiz: Document = document): void {
	raiz.querySelectorAll<HTMLAnchorElement>('.menu-celular a').forEach((link) => {
		link.addEventListener('click', () => link.closest('details')?.removeAttribute('open'));
	});
}
