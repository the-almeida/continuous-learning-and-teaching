// @vitest-environment happy-dom
// O menu do celular, as abas do "Quem te escuta" e a seção atual no menu do design E.
import { beforeEach, describe, expect, it } from 'vitest';
import { fecharMenuAoNavegar, focaveisDoMenu, iniciarMenuCelular, proximoFocoPreso } from '../src/scripts/menu';
import { abriuForaDaVista, iniciarAbasQuem } from '../src/scripts/quem-abas';
import { alvoNaAltura, alvosDosLinks, chegouAoDestino, linksDaPagina, noFimDaPagina } from '../src/scripts/secao-atual';

const MENU = `
	<details class="menu-celular">
		<summary>Menu</summary>
		<div class="menu-cheio">
			<a href="#abordagem">Abordagem</a>
			<a href="#convite">Convite</a>
			<button class="menu-fechar" type="button">Fechar</button>
		</div>
	</details>
`;

const menu = () => document.querySelector('.menu-celular') as HTMLDetailsElement;
const tecla = (key: string, shiftKey = false) => new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });

describe('proximoFocoPreso', () => {
	const [a, b, c] = ['a', 'b', 'c'].map((id) => Object.assign(document.createElement('button'), { id }));
	const focaveis = [a, b, c] as HTMLElement[];

	it('do último volta ao primeiro, e com Shift, do primeiro ao último', () => {
		expect(proximoFocoPreso(focaveis, c ?? null, false)).toBe(a);
		expect(proximoFocoPreso(focaveis, a ?? null, true)).toBe(c);
	});

	it('no meio, deixa o navegador seguir', () => {
		expect(proximoFocoPreso(focaveis, b ?? null, false)).toBeNull();
		expect(proximoFocoPreso([], null, false)).toBeNull();
	});
});

describe('o menu do celular', () => {
	beforeEach(() => {
		document.body.innerHTML = MENU;
		iniciarMenuCelular(document);
	});

	it('acha os links e o botão do menu em tela cheia', () => {
		expect(focaveisDoMenu(menu()).map((el) => el.textContent)).toEqual(['Abordagem', 'Convite', 'Fechar']);
	});

	it('o "Fechar" fecha e devolve o foco ao "Menu"', () => {
		menu().open = true;
		(document.querySelector('.menu-fechar') as HTMLButtonElement).click();
		expect(menu().open).toBe(false);
		expect(document.activeElement).toBe(document.querySelector('summary'));
	});

	it('o Esc fecha só com o menu aberto', () => {
		document.dispatchEvent(tecla('Escape'));
		expect(menu().open).toBe(false);
		menu().open = true;
		document.dispatchEvent(tecla('Escape'));
		expect(menu().open).toBe(false);
	});

	it('o Tab no último item volta ao primeiro', () => {
		menu().open = true;
		const fechar = document.querySelector('.menu-fechar') as HTMLButtonElement;
		fechar.focus();
		const evento = tecla('Tab');
		document.dispatchEvent(evento);
		expect(evento.defaultPrevented).toBe(true);
		expect(document.activeElement?.textContent).toBe('Abordagem');
	});

	it('um link do menu fecha o menu ao navegar', () => {
		fecharMenuAoNavegar(document);
		menu().open = true;
		(document.querySelector('.menu-cheio a') as HTMLAnchorElement).click();
		expect(menu().hasAttribute('open')).toBe(false);
	});
});

describe('as abas do "Quem te escuta"', () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<button class="quem-aba" aria-expanded="false" aria-controls="quem-trajetoria">Trajetória</button>
			<div id="quem-trajetoria"><p>Texto da trajetória.</p></div>
			<button class="quem-aba" aria-expanded="false" aria-controls="sem-painel">Quebrada</button>
		`;
		iniciarAbasQuem(document);
	});

	it('começam fechadas só com JavaScript', () => {
		expect((document.getElementById('quem-trajetoria') as HTMLElement).hidden).toBe(true);
	});

	it('abrem e fecham, com o aria-expanded junto', () => {
		const aba = document.querySelector('.quem-aba') as HTMLButtonElement;
		const painel = document.getElementById('quem-trajetoria') as HTMLElement;
		aba.click();
		expect(painel.hidden).toBe(false);
		expect(aba.getAttribute('aria-expanded')).toBe('true');
		aba.click();
		expect(painel.hidden).toBe(true);
		expect(aba.getAttribute('aria-expanded')).toBe('false');
	});

	it('sabem quando o texto abriria fora da vista', () => {
		expect(abriuForaDaVista(900, 1000)).toBe(true);
		expect(abriuForaDaVista(500, 1000)).toBe(false);
	});
});

describe('a seção atual', () => {
	const caixa = (top: number, bottom: number) => ({ getBoundingClientRect: () => ({ top, bottom }) });

	it('acha a seção que cruza a linha dos olhos', () => {
		const alvos = [
			{ id: 'abordagem', inicio: caixa(-500, 100), fim: caixa(-500, 100) },
			{ id: 'o-que-nos-adoece', inicio: caixa(100, 300), fim: caixa(300, 900) },
			{ id: 'convite', inicio: caixa(900, 1400), fim: caixa(900, 1400) },
		];
		expect(alvoNaAltura(alvos, 400)?.id).toBe('o-que-nos-adoece');
		expect(alvoNaAltura(alvos, 50)?.id).toBe('abordagem');
		expect(alvoNaAltura(alvos, -600)).toBeUndefined();
	});

	it('considera que a rolagem chegou com 4 px de folga ou no fim da página', () => {
		expect(chegouAoDestino(83, 80, false)).toBe(true);
		expect(chegouAoDestino(120, 80, false)).toBe(false);
		expect(chegouAoDestino(400, 80, true)).toBe(true);
	});

	it('sabe quando a página acabou', () => {
		expect(noFimDaPagina(2000, 1000, 3001)).toBe(true);
		expect(noFimDaPagina(1500, 1000, 3000)).toBe(false);
	});

	it('liga cada âncora do menu ao trecho que ela cobre', () => {
		document.body.innerHTML = `
			<nav><a href="#abordagem">A</a><a href="#o-que-nos-adoece">B</a><a href="#abordagem">A de novo</a><a href="#sumiu">C</a></nav>
			<section id="abordagem"></section><figure id="o-que-nos-adoece"></figure><section id="o-que-nos-adoece-texto"></section>
		`;
		const alvos = alvosDosLinks([...document.querySelectorAll<HTMLAnchorElement>('nav a')], document);
		expect(alvos.map(({ id, inicio, fim }) => [id, inicio.id, fim.id])).toEqual([
			['abordagem', 'abordagem', 'abordagem'],
			['o-que-nos-adoece', 'o-que-nos-adoece', 'o-que-nos-adoece-texto'],
		]);
	});

	it('nas páginas de "Ler mais", marca o link da própria página', () => {
		document.body.innerHTML = `<a href="/e/5/saude-da-mulher/">Saúde</a><a href="/e/5/saberes-complementares/">Saberes</a><a href="/e/5/#convite">Convite</a>`;
		const links = [...document.querySelectorAll('a')];
		expect(linksDaPagina(links, '/e/5/saude-da-mulher/').map((link) => link.textContent)).toEqual(['Saúde']);
	});
});
