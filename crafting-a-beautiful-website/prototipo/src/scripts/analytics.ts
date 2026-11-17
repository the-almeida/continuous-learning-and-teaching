// As medições que o protótipo soma ao Umami (veja o comentário de Analytics.astro): cliques com o lugar, rolagem,
// seções vistas, tempo com a página visível e leitura por seção. Sem o script do Umami, os eventos esperam numa fila;
// com ?analytics=debug, também aparecem no console.

export type Dados = Record<string, string | number>;

interface Umami {
	track(nome: string, dados?: Dados): void;
}

declare global {
	interface Window {
		umami?: Umami;
	}
}

// Marcos de cada medição, em porcentagem da página ou em segundos.
export const MARCOS_DE_ROLAGEM = [25, 50, 75, 100];
export const MARCOS_DE_TEMPO = [10, 30, 60, 120, 300];
export const MARCOS_DE_LEITURA = [5, 15, 30, 60, 120];
// A mesma linha dos olhos do menu (40% da tela).
export const ALTURA_DOS_OLHOS = 0.4;

// --- Partes puras: testáveis sem navegador ---

// Quanto da página já passou, de 0 a 100. Página que cabe na tela conta como lida inteira.
export function porcentagemRolada(rolado: number, alturaDoDocumento: number, alturaDaTela: number): number {
	const total = alturaDoDocumento - alturaDaTela;
	return total <= 0 ? 100 : Math.round((rolado / total) * 100);
}

// Os marcos alcançados agora e ainda não enviados. Dois pontos de folga: a última rolagem raramente chega a 100 exato.
// Marca os novos em `vistos`, para cada marco sair uma vez só.
export function marcosNovos(feito: number, marcos: number[], vistos: Set<number>): number[] {
	const novos = marcos.filter((marco) => feito >= marco - 2 && !vistos.has(marco));
	novos.forEach((marco) => vistos.add(marco));
	return novos;
}

// Soma um segundo a cada seção e devolve as que acabaram de bater um marco de leitura.
export function somarLeitura(lidos: Map<string, number>, secoes: Iterable<string>, marcos = MARCOS_DE_LEITURA) {
	const batidas: { secao: string; segundos: number }[] = [];
	for (const secao of new Set(secoes)) {
		const segundos = (lidos.get(secao) ?? 0) + 1;
		lidos.set(secao, segundos);
		if (marcos.includes(segundos)) batidas.push({ secao, segundos });
	}
	return batidas;
}

// O texto do alvo de um clique, como aparece no evento: o aria-label ou o texto, numa linha só e com até 80 letras.
export const textoDoAlvo = (el: Element) => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);

// O nome de cada seção: na inicial, o id (a citação e o texto do "O que nos adoece" contam juntos); nas páginas de "Ler
// mais", o data-secao de cada parte; sem nenhum dos dois, a última classe.
export const nomeDaSecao = (el: HTMLElement) => el.dataset.secao || el.id.replace(/-texto$/, '') || el.className.split(' ').pop() || '';

const SELETOR_DE_SECAO = '[data-secao], main > section, main > figure';

// Onde o clique aconteceu. O menu em tela cheia fica dentro do cabeçalho: ele vem antes, para os dois WhatsApp do menu
// não saírem iguais.
export function lugarDoClique(el: Element): string {
	if (el.closest('.menu-cheio')) return 'menu-cheio';
	if (el.closest('.cabecalho')) return 'menu';
	if (el.closest('.rodape')) return 'rodape';
	if (el.closest('.painel, .troca-abertura')) return 'prototipo';
	const secao = el.closest<HTMLElement>(SELETOR_DE_SECAO);
	if (secao) return nomeDaSecao(secao);
	return el.closest('article')?.className.split(' ').pop() || 'pagina';
}

export interface Evento {
	nome: string;
	dados: Dados;
}

// O evento de um clique num elemento interativo, ou null quando ele não conta. O clique chega antes de o <details>
// trocar: aberto agora quer dizer que vai fechar. Na FAQ, só abrir conta.
export function eventoDoClique(el: Element, pagina: string): Evento | null {
	const dados: Dados = { pagina, lugar: lugarDoClique(el), alvo: textoDoAlvo(el) };
	if (el.matches('summary')) {
		const abrindo = !(el.parentElement as HTMLDetailsElement | null)?.open;
		if (el.closest('.pergunta')) return abrindo ? { nome: 'pergunta', dados } : null;
		return { nome: abrindo ? 'abrir' : 'fechar', dados };
	}
	if (el.matches('button[aria-expanded]')) {
		return { nome: el.getAttribute('aria-expanded') === 'true' ? 'fechar' : 'abrir', dados };
	}
	if (el.matches('a')) {
		const href = el.getAttribute('href') || '';
		const nome = href.startsWith('mailto:') ? 'email' : href.includes('#') ? 'ancora' : 'link';
		return { nome, dados: { ...dados, destino: href } };
	}
	return { nome: 'clique', dados };
}

// Envia ao Umami ou guarda na fila até ele carregar (o script vem com defer).
export function criarEnvio(janela: Window, debug: boolean) {
	const fila: Evento[] = [];
	const enviar = (nome: string, dados: Dados) => {
		if (debug) console.log('[analytics]', nome, dados);
		if (janela.umami) janela.umami.track(nome, dados);
		else fila.push({ nome, dados });
	};
	const esvaziar = () => {
		if (!janela.umami) return false;
		fila.splice(0).forEach(({ nome, dados }) => janela.umami?.track(nome, dados));
		return true;
	};
	return { enviar, esvaziar, fila };
}

// --- A ligação com a página ---

export function iniciarAnalytics(documento: Document = document): void {
	const janela = documento.defaultView;
	if (!janela) return;
	const debug = new URLSearchParams(janela.location.search).get('analytics') === 'debug';
	const { enviar, esvaziar } = criarEnvio(janela, debug);
	const tentativa = janela.setInterval(() => esvaziar() && janela.clearInterval(tentativa), 1000);
	janela.setTimeout(() => janela.clearInterval(tentativa), 30000);

	const pagina = janela.location.pathname;
	const secoes = [...documento.querySelectorAll<HTMLElement>('main > section, main > figure, main [data-secao]')];

	// O WhatsApp já é contado pelo Umami: aqui ele só ganha o lugar do clique.
	documento.querySelectorAll('[data-whatsapp]').forEach((el) => {
		el.setAttribute('data-umami-event', 'whatsapp');
		el.setAttribute('data-umami-event-lugar', lugarDoClique(el));
	});

	documento.addEventListener(
		'click',
		(evento) => {
			const el = (evento.target as Element | null)?.closest('a, button, summary, label');
			if (!el || el.closest('[data-sem-analytics]')) return;
			if (el.hasAttribute('data-umami-event')) {
				if (debug) console.log('[analytics]', el.getAttribute('data-umami-event'), { lugar: el.getAttribute('data-umami-event-lugar') });
				return;
			}
			const registro = eventoDoClique(el, pagina);
			if (registro) enviar(registro.nome, registro.dados);
		},
		true,
	);

	// Rolagem: a maior profundidade, em marcos, uma vez cada.
	const rolagensVistas = new Set<number>();
	const medirRolagem = () => {
		const feito = porcentagemRolada(janela.scrollY, documento.documentElement.scrollHeight, janela.innerHeight);
		marcosNovos(feito, MARCOS_DE_ROLAGEM, rolagensVistas).forEach((porcentagem) => enviar('rolagem', { pagina, porcentagem }));
	};
	let agendado = false;
	janela.addEventListener(
		'scroll',
		() => {
			if (agendado) return;
			agendado = true;
			janela.requestAnimationFrame(() => {
				agendado = false;
				medirRolagem();
			});
		},
		{ passive: true },
	);

	// Cada seção que chegou à altura dos olhos, uma vez cada. Com a linha no lugar da metade da seção à vista, as seções
	// mais altas que duas telas também contam.
	if ('IntersectionObserver' in janela) {
		const vistas = new Set<string>();
		const observador = new janela.IntersectionObserver(
			(entradas) =>
				entradas.forEach((entrada) => {
					if (!entrada.isIntersecting) return;
					observador.unobserve(entrada.target);
					const secao = nomeDaSecao(entrada.target as HTMLElement);
					if (vistas.has(secao)) return;
					vistas.add(secao);
					enviar('secao-vista', { pagina, secao });
				}),
			{ rootMargin: '-40% 0px -60% 0px' },
		);
		secoes.forEach((el) => observador.observe(el));
	}

	// Tempo com a página visível (aba em segundo plano não conta) e leitura por seção: a cada segundo, cada seção que
	// cruza a linha dos olhos ganha um segundo.
	const lidos = new Map<string, number>();
	let visivel = 0;
	janela.setInterval(() => {
		if (documento.visibilityState !== 'visible') return;
		visivel++;
		if (MARCOS_DE_TEMPO.includes(visivel)) enviar('tempo', { pagina, segundos: visivel });
		const olhos = janela.innerHeight * ALTURA_DOS_OLHOS;
		const lendo = secoes.filter((el) => {
			const { top, bottom } = el.getBoundingClientRect();
			return top <= olhos && bottom > olhos;
		});
		somarLeitura(lidos, lendo.map(nomeDaSecao)).forEach((batida) => enviar('leitura', { pagina, ...batida }));
	}, 1000);
}
