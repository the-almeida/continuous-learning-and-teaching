// As abas do "Quem te escuta" no design E. Fecham aqui, e não no HTML: sem JavaScript, os textos ficam abertos em vez
// de inacessíveis.

// Abaixo desta fração da altura da tela, o texto que abre ficaria fora da vista.
export const PE_DA_TELA = 0.85;

export const abriuForaDaVista = (topoDoPainel: number, alturaDaTela: number) => topoDoPainel > alturaDaTela * PE_DA_TELA;

export function iniciarAbasQuem(raiz: Document = document): void {
	const janela = raiz.defaultView;
	raiz.querySelectorAll<HTMLButtonElement>('.quem-aba').forEach((aba) => {
		const painel = raiz.getElementById(aba.getAttribute('aria-controls') ?? '');
		if (!painel) return;
		painel.hidden = true;
		aba.setAttribute('aria-expanded', 'false');
		aba.addEventListener('click', () => {
			const abrir = painel.hidden;
			painel.hidden = !abrir;
			aba.setAttribute('aria-expanded', String(abrir));
			if (abrir && janela && abriuForaDaVista(painel.getBoundingClientRect().top, janela.innerHeight)) {
				painel.scrollIntoView({ block: 'nearest' });
			}
		});
	});
}
