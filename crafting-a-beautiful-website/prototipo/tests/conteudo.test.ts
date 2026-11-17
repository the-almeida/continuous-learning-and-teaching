// Confere a copy de verdade, em ../copy/: as cinco copies seguem o formato que o site lê, e os dados de contato são os
// de exemplo, não os da cliente.
import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { lerBlocos, lerCopies, lerPerguntas, slug } from '../src/lib/copy';
import { linkPrivacidade, linkWhatsapp, site, telefoneWhatsapp } from '../src/data/site';
import { COPIES, DESIGN_NOVO, DESIGNS, VERSOES, ancoraDe } from '../src/data/variacoes';

const pastaCopy = new URL('../../copy/', import.meta.url);

describe('as copies', () => {
	it('existem as cinco, com os ids das variações', async () => {
		const copies = await lerCopies(pastaCopy);
		const ids = copies.map((copy) => copy.id);
		expect(ids).toEqual(['1', '2', '3', '4', '5']);
		expect([...COPIES.map((copy) => copy.id), ...VERSOES.map((versao) => versao.copy)]).toEqual(ids);
	});

	it('cada copy abre com a abertura e fecha com o convite', async () => {
		for (const { id, markdown } of await lerCopies(pastaCopy)) {
			const secoes = lerBlocos(markdown).map((bloco) => slug(bloco.titulo.split('·').pop() ?? ''));
			expect(secoes[0], `copy ${id}`).toBe('abertura');
			expect(secoes.at(-1), `copy ${id}`).toBe('convite');
		}
	});

	it('toda seção tem pelo menos um campo com texto', async () => {
		for (const { id, markdown } of await lerCopies(pastaCopy)) {
			for (const bloco of lerBlocos(markdown)) {
				const preenchidos = Object.values(bloco.campos).filter((texto) => texto.trim());
				expect(preenchidos.length, `copy ${id}, ${bloco.titulo}`).toBeGreaterThan(0);
			}
		}
	});

	it('a copy final não usa travessão, uma regra de voz do projeto', async () => {
		const markdown = await readFile(new URL('5-copy-4-no-design-e.md', pastaCopy), 'utf-8');
		const textoDoSite = lerBlocos(markdown).flatMap((bloco) => Object.values(bloco.campos));
		expect(textoDoSite.filter((texto) => texto.includes('—'))).toEqual([]);
	});

	it('as notas internas ficaram fora do repositório', async () => {
		for (const arquivo of (await readdir(pastaCopy)).filter((nome) => nome.endsWith('.md'))) {
			const markdown = await readFile(new URL(arquivo, pastaCopy), 'utf-8');
			const notas = markdown.slice(0, markdown.indexOf('\n## '));
			expect(notas, arquivo).not.toMatch(/\]\(<?\.\.\//);
			expect(notas.split('\n').filter(Boolean).length, arquivo).toBeLessThanOrEqual(2);
		}
	});

	it('as perguntas frequentes têm pergunta e resposta', async () => {
		const perguntas = lerPerguntas(await readFile(new URL('perguntas.md', pastaCopy), 'utf-8'));
		expect(perguntas.length).toBeGreaterThan(3);
		for (const { pergunta, resposta } of perguntas) {
			expect(pergunta).toMatch(/\?$/);
			expect(resposta.length).toBeGreaterThan(10);
		}
	});
});

describe('os dados do site', () => {
	it('usam contato de exemplo', () => {
		expect(site.url).toBe('https://example.com');
		expect(site.email).toMatch(/@example\.com$/);
		expect(site.crp).toBe('CRP 00/00000');
		expect(site.whatsapp).toMatch(/^550+$/);
	});

	it('formata o telefone do WhatsApp como se lê no Brasil', () => {
		expect(telefoneWhatsapp).toBe('(00) 00000-0000');
	});

	it('monta os links do WhatsApp com a mensagem codificada', () => {
		const link = new URL(linkWhatsapp);
		expect(link.origin).toBe('https://wa.me');
		expect(link.pathname).toBe(`/${site.whatsapp}`);
		expect(link.searchParams.get('text')).toBe(site.mensagemWhatsapp);
		expect(new URL(linkPrivacidade).searchParams.get('text')).toBe(site.mensagemPrivacidade);
	});

	it('não manda dado de saúde na mensagem pronta', () => {
		expect(site.mensagemWhatsapp).not.toMatch(/ansiedade|depress|sintoma|diagn/i);
	});
});

describe('as variações', () => {
	it('têm ids únicos e o design novo fica fora da grade', () => {
		const designs = DESIGNS.map((design) => design.id);
		expect(new Set(designs).size).toBe(designs.length);
		expect(designs).not.toContain(DESIGN_NOVO);
	});

	it('cada design tem cor e fundo em hexadecimal', () => {
		for (const design of DESIGNS) {
			expect(design.cor).toMatch(/^#[0-9a-f]{6}$/i);
			expect(design.fundo).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});

	it('ancoraDe tira a pasta e o número da seção', () => {
		expect(ancoraDe('1/02-abordagem')).toBe('abordagem');
		expect(ancoraDe('05-saude-da-mulher')).toBe('saude-da-mulher');
		expect(ancoraDe('convite')).toBe('convite');
	});
});
