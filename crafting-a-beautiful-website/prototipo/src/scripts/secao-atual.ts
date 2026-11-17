// Só no menu do design E.
// - A seção atual: o item do menu da seção que está na altura dos olhos (a 40% da tela) fica marcado, no computador e
//   no menu em tela cheia; na abertura, o nome no menu; depois das perguntas, nenhum. No clique, o item clicado já fica
//   marcado e não pisca enquanto a página rola. Nas páginas de "Ler mais", o item da página fica marcado.
// - O aviso no fim: abaixo das perguntas, um fio claro circula em volta do botão do WhatsApp do menu.
// - Quando a pessoa volta rolando até a abertura, o endereço passa a terminar em #inicio, sem criar entrada no histórico.
// A seção atual e o aviso têm liga/desliga no protótipo (?secao=0, ?aviso=0), guardado no navegador.
import { ligado, preferencia } from './preferencias';

// A altura dos olhos, em fração da altura da tela. É a mesma linha que o analytics usa para contar leitura.
export const ALTURA_DOS_OLHOS = 0.4;
// Quanto tempo, no máximo, o item clicado fica preso enquanto a página rola até a seção.
export const LIMITE_DO_CLIQUE_MS = 2000;

interface Retangulo {
	top: number;
	bottom: number;
}

interface Medivel {
	getBoundingClientRect(): Retangulo;
}

// A âncora de cada item do menu e o trecho da página que ele cobre: o "O que nos adoece" vai da citação ao fim do texto.
export interface Alvo<T extends Medivel = HTMLElement> {
	id: string;
	inicio: T;
	fim: T;
}

// A seção que cruza a linha dos olhos, ou undefined na abertura e depois da última.
export function alvoNaAltura<T extends Medivel>(alvos: Alvo<T>[], olhos: number): Alvo<T> | undefined {
	return alvos.find(({ inicio, fim }) => inicio.getBoundingClientRect().top <= olhos && fim.getBoundingClientRect().bottom > olhos);
}

// Depois de um clique, a seção "chegou" quando o topo dela encosta embaixo do menu (o scroll-padding-top), com 4 px de
// folga, ou quando a página acabou e ela não tem como subir mais.
export const chegouAoDestino = (topoDoDestino: number, recuoDoMenu: number, fimDaPagina: boolean) =>
	Math.abs(topoDoDestino - recuoDoMenu) < 4 || fimDaPagina;

export const noFimDaPagina = (rolado: number, alturaDaTela: number, alturaDoDocumento: number) =>
	rolado + alturaDaTela >= alturaDoDocumento - 2;

export const ancoraDoLink = (link: HTMLAnchorElement) => new URL(link.href).hash.slice(1);

export function alvosDosLinks(links: HTMLAnchorElement[], raiz: Document = document): Alvo[] {
	return [...new Set(links.map(ancoraDoLink))].flatMap((id) => {
		const inicio = id ? raiz.getElementById(id) : null;
		if (!inicio) return [];
		const fim = raiz.getElementById(`${id}-texto`) ?? inicio;
		return [{ id, inicio, fim }];
	});
}

// Nas páginas de "Ler mais", os links sem âncora que apontam para a própria página.
export const linksDaPagina = (links: HTMLAnchorElement[], caminho: string) =>
	links.filter((link) => !ancoraDoLink(link) && new URL(link.href).pathname === caminho);

function marcarPagina(links: HTMLAnchorElement[], janela: Window): void {
	links.forEach((link) => {
		link.setAttribute('aria-current', 'page');
		// Clicar no item da própria página rola até o topo, sem recarregar.
		link.addEventListener('click', (evento) => {
			evento.preventDefault();
			const suave = !janela.matchMedia('(prefers-reduced-motion: reduce)').matches;
			janela.requestAnimationFrame(() => janela.scrollTo({ top: 0, behavior: suave ? 'smooth' : 'auto' }));
		});
	});
}

function aplicarTrocas(raiz: HTMLElement, janela: Window): void {
	const busca = new URLSearchParams(janela.location.search);
	for (const nome of ['secao', 'aviso']) raiz.toggleAttribute(`data-sem-${nome}`, !ligado(preferencia(nome, '1', { busca })));
}

export function iniciarSecaoAtual(documento: Document = document): void {
	const janela = documento.defaultView;
	if (!janela || !documento.querySelector('.menu-cheio')) return;
	const raiz = documento.documentElement;
	aplicarTrocas(raiz, janela);

	const links = [...documento.querySelectorAll<HTMLAnchorElement>('.menu-largo a, .menu-cheio a')];
	const daPagina = linksDaPagina(links, janela.location.pathname);
	if (daPagina.length) return marcarPagina(daPagina, janela);

	const alvos = alvosDosLinks(links, documento);
	const ultimo = alvos[alvos.length - 1];
	if (!ultimo) return;

	const abertura = documento.getElementById('inicio');
	const marca = documento.querySelector('.marca');
	const whatsapp = documento.querySelector('.cabecalho-whatsapp');
	let atual: string | null = null;
	// Só depois da primeira rolagem: quem abre a página no topo continua com o endereço limpo.
	let rolou = false;
	// No clique, o item clicado fica preso até a seção chegar embaixo do menu (ou a página acabar), com um limite de
	// tempo. Não depende do fim da rolagem: quem clica com a página ainda rolando soltaria o item antes da hora.
	let travado: ReturnType<typeof setTimeout> | null = null;
	let destino: Alvo | null = null;

	const semSecao = () => raiz.hasAttribute('data-sem-secao');
	const chegou = () =>
		!destino ||
		chegouAoDestino(
			destino.inicio.getBoundingClientRect().top,
			parseFloat(janela.getComputedStyle(raiz).scrollPaddingTop) || 0,
			noFimDaPagina(janela.scrollY, janela.innerHeight, raiz.scrollHeight),
		);
	const soltar = () => {
		if (travado) clearTimeout(travado);
		travado = null;
		destino = null;
	};
	const marcar = (id: string | null) => {
		if (id === atual) return;
		atual = id;
		links.forEach((link) => {
			if (ancoraDoLink(link) === id) link.setAttribute('aria-current', 'true');
			else link.removeAttribute('aria-current');
		});
	};
	const medir = () => {
		const olhos = janela.innerHeight * ALTURA_DOS_OLHOS;
		const passouDoFim = ultimo.fim.getBoundingClientRect().bottom < olhos;
		whatsapp?.classList.toggle('cabecalho-whatsapp-chamando', passouDoFim && !raiz.hasAttribute('data-sem-aviso'));
		if (travado) {
			if (!chegou()) return;
			soltar();
		}
		marcar(semSecao() ? null : (alvoNaAltura(alvos, olhos)?.id ?? null));
		const naAbertura = Boolean(abertura && abertura.getBoundingClientRect().bottom > olhos);
		if (naAbertura && !semSecao()) marca?.setAttribute('aria-current', 'true');
		else marca?.removeAttribute('aria-current');
		if (rolou && naAbertura && janela.location.hash !== '#inicio') {
			const { pathname, search } = janela.location;
			janela.history.replaceState(janela.history.state, '', `${pathname}${search}#inicio`);
		}
	};

	let pedido = false;
	janela.addEventListener(
		'scroll',
		() => {
			rolou = true;
			if (pedido) return;
			pedido = true;
			janela.requestAnimationFrame(() => {
				pedido = false;
				medir();
			});
		},
		{ passive: true },
	);
	janela.addEventListener('resize', medir);
	links.forEach((link) =>
		link.addEventListener('click', () => {
			if (semSecao()) return;
			const alvo = alvos.find((item) => item.id === ancoraDoLink(link));
			if (!alvo) return;
			marcar(alvo.id);
			soltar();
			destino = alvo;
			travado = setTimeout(() => {
				soltar();
				medir();
			}, LIMITE_DO_CLIQUE_MS);
		}),
	);
	// A troca do protótipo liga e desliga sem recarregar.
	new MutationObserver(medir).observe(raiz, { attributes: true, attributeFilter: ['data-sem-secao', 'data-sem-aviso'] });
	medir();
}

// O cabeçalho vem antes das seções: só mede depois de a página inteira estar no DOM.
export function quandoPronto(documento: Document, acao: () => void): void {
	if (documento.readyState === 'loading') documento.addEventListener('DOMContentLoaded', acao, { once: true });
	else acao();
}
