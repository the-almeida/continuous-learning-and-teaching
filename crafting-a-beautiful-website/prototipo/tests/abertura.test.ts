// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
	CHAVES,
	GRUPOS,
	ehAtalhoDosSeletores,
	ehChave,
	ehGrupo,
	iniciarSeletores,
	iniciarTrocaDeAbertura,
	iniciarTrocasDoDesignE,
	seletoresVisiveisNoInicio,
	versaoInicial,
} from '../src/scripts/abertura';

const abrirEm = (endereco: string) => history.replaceState(null, '', endereco);
const abertura = () => document.querySelector('.abertura') as HTMLElement;

beforeEach(() => {
	localStorage.clear();
	abrirEm('/e/5/');
});

describe('versaoInicial', () => {
	it('o endereço conta a partir de 1', () => {
		expect(versaoInicial(new URLSearchParams('abertura=2'), '0')).toBe(1);
	});

	it('sem endereço, vale a guardada, e sem nada, a primeira', () => {
		expect(versaoInicial(new URLSearchParams(), '2')).toBe(2);
		expect(versaoInicial(new URLSearchParams(), null)).toBe(0);
	});
});

describe('a troca de abertura dos designs A a D', () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<div class="troca-abertura"><input type="radio" name="abertura" value="0"><input type="radio" name="abertura" value="1"></div>
			<section class="abertura"><div data-versao="0">Primeira</div><div data-versao="1">Segunda</div></section>
		`;
	});

	const visiveis = () => [...document.querySelectorAll<HTMLElement>('[data-versao]')].filter((el) => !el.hidden).map((el) => el.textContent);

	it('mostra a versão pedida no endereço', () => {
		abrirEm('/a/1/?abertura=2');
		iniciarTrocaDeAbertura(document);
		expect(visiveis()).toEqual(['Segunda']);
	});

	it('troca e guarda a escolha', () => {
		iniciarTrocaDeAbertura(document);
		const segunda = document.querySelector('input[value="1"]') as HTMLInputElement;
		segunda.checked = true;
		segunda.dispatchEvent(new Event('change', { bubbles: true }));
		expect(visiveis()).toEqual(['Segunda']);
		expect(localStorage.getItem('v2:troca-abertura')).toBe('1');
	});
});

describe('as trocas do design E', () => {
	beforeEach(() => {
		const radios = (nome: string, valores: string[]) =>
			valores.map((valor) => `<input type="radio" name="troca-${nome}" value="${valor}">`).join('');
		const caixas = Object.keys(CHAVES)
			.map((nome) => `<input type="checkbox" name="troca-${nome}">`)
			.join('');
		document.body.innerHTML = `
			<section class="abertura">
				<form class="troca-abertura troca-botoes">
					${radios('botao', ['fio', 'negrito', 'cheio'])}${radios('link', ['atual', 'fio'])}
					${radios('altura', ['meio', 'cima'])}${radios('frase', ['etiqueta', 'foto'])}${caixas}
				</form>
			</section>
		`;
	});

	it('começa nos padrões, com tudo ligado', () => {
		iniciarTrocasDoDesignE(document);
		expect({ ...abertura().dataset }).toEqual(GRUPOS);
		for (const atributo of Object.values(CHAVES)) expect(abertura().hasAttribute(atributo)).toBe(false);
	});

	it('lê o endereço e cai no padrão quando o valor não existe', () => {
		abrirEm('/e/5/?botao=cheio&link=inexistente&aviso=0');
		iniciarTrocasDoDesignE(document);
		expect(abertura().dataset.botao).toBe('cheio');
		expect(abertura().dataset.link).toBe('atual');
		expect(abertura().hasAttribute('data-sem-aviso')).toBe(true);
		// O aviso vale para a página toda.
		expect(document.documentElement.hasAttribute('data-sem-aviso')).toBe(true);
	});

	it('guarda o que muda no formulário', () => {
		iniciarTrocasDoDesignE(document);
		const negrito = document.querySelector('input[name="troca-botao"][value="negrito"]') as HTMLInputElement;
		negrito.checked = true;
		negrito.dispatchEvent(new Event('change', { bubbles: true }));
		const whatsapp = document.querySelector('input[name="troca-whatsapp"]') as HTMLInputElement;
		whatsapp.checked = false;
		whatsapp.dispatchEvent(new Event('change', { bubbles: true }));
		expect(abertura().dataset.botao).toBe('negrito');
		expect(abertura().hasAttribute('data-sem-whatsapp')).toBe(true);
		expect(localStorage.getItem('v2:troca-botao')).toBe('negrito');
		expect(localStorage.getItem('v2:troca-whatsapp')).toBe('0');
	});

	it('separa os grupos dos liga/desliga', () => {
		expect(ehGrupo('botao')).toBe(true);
		expect(ehGrupo('aviso')).toBe(false);
		expect(ehChave('aviso')).toBe(true);
		expect(ehChave('inventado')).toBe(false);
	});
});

describe('os seletores do protótipo', () => {
	beforeEach(() => {
		document.body.innerHTML = `<section class="abertura"><div class="trocas"></div><button class="trocas-botao">Exibir variações de design</button></section>`;
	});

	it('começam escondidos, a menos que o endereço ou a escolha guardada peçam', () => {
		expect(seletoresVisiveisNoInicio(new URLSearchParams(), null)).toBe(false);
		expect(seletoresVisiveisNoInicio(new URLSearchParams(), '1')).toBe(true);
		expect(seletoresVisiveisNoInicio(new URLSearchParams('seletores=1'), '0')).toBe(true);
		expect(seletoresVisiveisNoInicio(new URLSearchParams('seletores=0'), '1')).toBe(false);
	});

	it('reconhecem o atalho Ctrl+Shift+U', () => {
		expect(ehAtalhoDosSeletores({ ctrlKey: true, shiftKey: true, code: 'KeyU' })).toBe(true);
		expect(ehAtalhoDosSeletores({ ctrlKey: true, shiftKey: false, code: 'KeyU' })).toBe(false);
	});

	it('o botão e o atalho alternam, e a escolha fica guardada', () => {
		iniciarSeletores(document);
		const botao = document.querySelector('.trocas-botao') as HTMLButtonElement;
		expect(abertura().hasAttribute('data-sem-trocas')).toBe(true);
		expect(botao.getAttribute('aria-pressed')).toBe('false');

		botao.click();
		expect(abertura().hasAttribute('data-sem-trocas')).toBe(false);
		expect(localStorage.getItem('v2:trocas-visiveis')).toBe('1');

		document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, code: 'KeyU', bubbles: true }));
		expect(abertura().hasAttribute('data-sem-trocas')).toBe(true);
	});
});
