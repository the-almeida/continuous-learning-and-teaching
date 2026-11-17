// As trocas da abertura no protótipo. Servem para a cliente comparar variações na mesma página, sem trocar de endereço.
import { gravarGuardado, lerGuardado, ligado, preferencia } from './preferencias';

// --- A troca de abertura (designs A a D): qual das versões da primeira tela aparece ---

// ?abertura=2 no endereço é a segunda versão (índice 1). Sem nada no endereço, vale a guardada, e sem nada guardado, a
// primeira.
export function versaoInicial(busca: URLSearchParams, guardada: string | null): number {
	const doEndereco = busca.get('abertura');
	if (doEndereco) return Number(doEndereco) - 1;
	return Number(guardada ?? 0);
}

export function iniciarTrocaDeAbertura(documento: Document = document): void {
	const troca = documento.querySelector('.troca-abertura:not(.troca-botoes)');
	const janela = documento.defaultView;
	if (!troca || !janela) return;
	const mostrar = (versao: string | number) => {
		documento.querySelectorAll<HTMLElement>('.abertura [data-versao]').forEach((el) => {
			el.hidden = el.dataset.versao !== String(versao);
		});
		const campo = troca.querySelector<HTMLInputElement>(`input[value="${versao}"]`);
		if (campo) campo.checked = true;
	};
	const inicial = versaoInicial(new URLSearchParams(janela.location.search), lerGuardado('troca-abertura'));
	if (troca.querySelector(`input[value="${inicial}"]`)) mostrar(inicial);
	troca.addEventListener('change', (evento) => {
		const valor = (evento.target as HTMLInputElement).value;
		mostrar(valor);
		gravarGuardado('troca-abertura', valor);
	});
}

// --- As trocas do design E ---
// O desenho do botão do WhatsApp (?botao=), do link da abordagem (?link=), da frase (?frase=) e a altura da abertura
// (?altura=), e os liga/desliga (?whatsapp=0, ?comlink=0, ?comfrase=0, ?secao=0, ?aviso=0).

export const GRUPOS = { botao: 'fio', link: 'atual', altura: 'meio', frase: 'etiqueta' } as const;

// O nome de cada liga/desliga e o atributo que a abertura ganha quando ele está desligado.
export const CHAVES = {
	whatsapp: 'data-sem-whatsapp',
	comlink: 'data-sem-link',
	comfrase: 'data-sem-frase',
	secao: 'data-sem-secao',
	aviso: 'data-sem-aviso',
} as const;

// A seção atual e o aviso do menu valem para a página toda, então vão também no <html>.
export const DA_PAGINA_TODA: ReadonlySet<string> = new Set(['secao', 'aviso']);

type Grupo = keyof typeof GRUPOS;
type Chave = keyof typeof CHAVES;

export const ehGrupo = (nome: string): nome is Grupo => nome in GRUPOS;
export const ehChave = (nome: string): nome is Chave => nome in CHAVES;

export function iniciarTrocasDoDesignE(documento: Document = document): void {
	const abertura = documento.querySelector<HTMLElement>('.abertura');
	const trocas = documento.querySelectorAll('.troca-botoes');
	const janela = documento.defaultView;
	if (!abertura || !trocas.length || !janela) return;
	const busca = new URLSearchParams(janela.location.search);
	const campo = (nome: string, valor?: string) =>
		documento.querySelector<HTMLInputElement>(`.troca-botoes input[name="troca-${nome}"]${valor ? `[value="${valor}"]` : ''}`);

	// Um valor que não existe (um endereço antigo, uma escolha guardada de outra versão) cai no padrão do grupo.
	const aplicar = (nome: Grupo, valor: string) => {
		const escolhido = campo(nome, valor) ?? campo(nome, GRUPOS[nome]);
		if (!escolhido) return;
		escolhido.checked = true;
		abertura.dataset[nome] = escolhido.value;
	};
	const ligar = (nome: Chave, estaLigado: boolean) => {
		const caixa = campo(nome);
		if (caixa) caixa.checked = estaLigado;
		abertura.toggleAttribute(CHAVES[nome], !estaLigado);
		if (DA_PAGINA_TODA.has(nome)) documento.documentElement.toggleAttribute(CHAVES[nome], !estaLigado);
	};

	for (const [nome, padrao] of Object.entries(GRUPOS) as [Grupo, string][]) aplicar(nome, preferencia(nome, padrao, { busca }));
	for (const nome of Object.keys(CHAVES) as Chave[]) ligar(nome, ligado(preferencia(nome, '1', { busca })));

	trocas.forEach((troca) =>
		troca.addEventListener('change', (evento) => {
			const alvo = evento.target as HTMLInputElement;
			const nome = alvo.name.replace('troca-', '');
			if (ehChave(nome)) {
				ligar(nome, alvo.checked);
				gravarGuardado(`troca-${nome}`, alvo.checked ? '1' : '0');
			} else if (ehGrupo(nome)) {
				aplicar(nome, alvo.value);
				gravarGuardado(`troca-${nome}`, alvo.value);
			}
		}),
	);
}

// --- Mostrar e esconder os seletores ---
// Ctrl+Shift+U, ou o botão "Exibir variações de design" no canto, mostra e esconde os seletores do protótipo, para ver
// a abertura limpa; também vale ?seletores=0 e ?seletores=1. Começam escondidos: mostrar as variações é uma escolha de
// quem está testando, não algo que se vê sem querer.

export const ehAtalhoDosSeletores = (evento: Pick<KeyboardEvent, 'ctrlKey' | 'shiftKey' | 'code'>) =>
	evento.ctrlKey && evento.shiftKey && evento.code === 'KeyU';

export function seletoresVisiveisNoInicio(busca: URLSearchParams, guardado: string | null): boolean {
	const doEndereco = busca.get('seletores');
	if (doEndereco !== null) return doEndereco !== '0';
	return guardado === '1';
}

export function iniciarSeletores(documento: Document = document): void {
	const abertura = documento.querySelector<HTMLElement>('.abertura');
	const janela = documento.defaultView;
	if (!abertura || !abertura.querySelector('.trocas') || !janela) return;
	const botao = abertura.querySelector('.trocas-botao');
	const ocultar = (oculto: boolean) => {
		abertura.toggleAttribute('data-sem-trocas', oculto);
		botao?.setAttribute('aria-pressed', String(!oculto));
		gravarGuardado('trocas-visiveis', oculto ? '0' : '1');
	};
	const alternar = () => ocultar(!abertura.hasAttribute('data-sem-trocas'));
	ocultar(!seletoresVisiveisNoInicio(new URLSearchParams(janela.location.search), lerGuardado('trocas-visiveis')));
	documento.addEventListener('keydown', (evento) => {
		if (!ehAtalhoDosSeletores(evento)) return;
		evento.preventDefault();
		alternar();
	});
	botao?.addEventListener('click', alternar);
}
