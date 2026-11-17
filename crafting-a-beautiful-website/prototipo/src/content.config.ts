import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineCollection } from 'astro:content';
import type { Loader, LoaderContext } from 'astro/loaders';
import { z } from 'astro/zod';
import { cards, lerBlocos, lerCopies, lerPerguntas, lista, slug, variacoes, type Campos } from './lib/copy';

// O mesmo formato de seções do repo oficial, com "variante" (1 a 4) e dois campos a mais
// (destaque e epígrafe). A seção escolhida vira arquivo em src/content/home/ do repo oficial.
const SECOES: Record<string, { tipo: string; menu?: string; pagina?: string }> = {
	abertura: { tipo: 'abertura' },
	abordagem: { tipo: 'abordagem', menu: 'Abordagem' },
	'quem-te-escuta': { tipo: 'quem-te-escuta', menu: 'Quem te escuta' },
	'o-que-nos-adoece': { tipo: 'texto', menu: 'O que nos adoece' },
	'saude-da-mulher': { tipo: 'aprofundamento', menu: 'Saúde da mulher', pagina: 'saude-da-mulher' },
	'saberes-complementares': { tipo: 'aprofundamento', menu: 'Saberes complementares', pagina: 'saberes-complementares' },
	'perguntas-frequentes': { tipo: 'perguntas', menu: 'Perguntas frequentes' },
	convite: { tipo: 'convite' },
};

function montar(secao: { tipo: string; menu?: string; pagina?: string }, campos: Campos) {
	const menu = campos.menu || secao.menu;
	switch (secao.tipo) {
		case 'abertura':
			return {
				data: {
					tipo: 'abertura',
					headline: campos.titulo,
					ancora: campos.ancora,
					botao: campos.botao,
					conhecaAbordagem: campos.link,
					frase: campos.frase,
					variacoes: variacoes(campos.variacoes),
				},
				corpo: campos.texto ?? '',
			};
		case 'abordagem':
			return { data: { tipo: 'abordagem', menu, titulo: campos.titulo, cards: cards(campos.cards) }, corpo: campos.texto ?? '' };
		case 'quem-te-escuta':
			return {
				data: {
					tipo: 'quem-te-escuta',
					menu,
					titulo: campos.titulo,
					apresentacao: campos.apresentacao,
					destaque: campos.destaque,
					trajetoria: campos.link,
					formacoes: lista(campos.formacao),
					estudos: lista(campos['estudos-complementares']),
					botao: campos.botao,
				},
				corpo: campos['texto-completo'] ?? '',
			};
		case 'aprofundamento':
			return {
				data: { tipo: 'aprofundamento', menu, titulo: campos.titulo, pagina: secao.pagina, linkTexto: campos.link },
				corpo: campos.texto ?? '',
			};
		case 'convite':
			return { data: { tipo: 'convite', ancora: campos.ancora, botao: campos.botao, botaoRotulo: campos['rotulo-do-botao'] }, corpo: campos.texto ?? '' };
		default:
			return {
				data: { tipo: secao.tipo, menu, titulo: campos.titulo, epigrafe: campos.epigrafe, citacao: campos.citacao, citacaoAutora: campos['citacao-autora'] },
				corpo: campos.texto ?? '',
			};
	}
}

const pastaCopy = (ctx: LoaderContext) => new URL('../copy/', ctx.config.root);

// No dev, editar um arquivo de copy recarrega o protótipo.
function observar(ctx: LoaderContext, sincronizar: () => Promise<void>) {
	const pasta = fileURLToPath(pastaCopy(ctx));
	ctx.watcher?.add(pasta);
	ctx.watcher?.on('change', (arquivo) => {
		if (arquivo.startsWith(pasta)) sincronizar();
	});
}

function loader(nome: string, sincronizar: (ctx: LoaderContext) => Promise<void>): Loader {
	return {
		name: nome,
		load: async (ctx) => {
			await sincronizar(ctx);
			observar(ctx, () => sincronizar(ctx));
		},
	};
}

const secoes = defineCollection({
	loader: loader('secoes-das-copies', async (ctx) => {
		ctx.store.clear();
		for (const { id: variante, markdown } of await lerCopies(pastaCopy(ctx))) {
			for (const { titulo, campos } of lerBlocos(markdown)) {
				if (titulo.startsWith('Página')) continue;
				const [numero = '', nome = ''] = titulo.split('·').map((parte) => parte.trim());
				const chave = slug(nome);
				const secao = SECOES[chave];
				if (!secao) {
					ctx.logger.warn(`Copy ${variante}: seção desconhecida "${titulo}"`);
					continue;
				}
				const { data, corpo } = montar(secao, campos);
				const id = `${variante}/${numero}-${chave}`;
				ctx.store.set({
					id,
					data: await ctx.parseData({ id, data: { variante, ...data } }),
					body: corpo,
					rendered: await ctx.renderMarkdown(corpo),
				});
			}
		}
	}),
	schema: z.discriminatedUnion('tipo', [
		z.object({
			variante: z.string(),
			tipo: z.literal('abertura'),
			headline: z.string(),
			ancora: z.string(),
			botao: z.string(),
			conhecaAbordagem: z.string().optional(),
			frase: z.string().optional(),
			variacoes: z.array(
				z.object({ nome: z.string(), headline: z.string().optional(), texto: z.string().optional(), frase: z.string().optional() }),
			),
		}),
		z.object({
			variante: z.string(),
			tipo: z.literal('abordagem'),
			menu: z.string().optional(),
			titulo: z.string().optional(),
			cards: z.array(z.object({ titulo: z.string(), texto: z.string() })),
		}),
		z.object({
			variante: z.string(),
			tipo: z.literal('quem-te-escuta'),
			menu: z.string().optional(),
			titulo: z.string().optional(),
			apresentacao: z.string(),
			destaque: z.string().optional(),
			trajetoria: z.string(),
			formacoes: z.array(z.string()),
			estudos: z.array(z.string()),
			botao: z.string().optional(),
		}),
		z.object({
			variante: z.string(),
			tipo: z.literal('texto'),
			menu: z.string().optional(),
			titulo: z.string().optional(),
			epigrafe: z.string().optional(),
			citacao: z.string().optional(),
			citacaoAutora: z.string().optional(),
		}),
		z.object({
			variante: z.string(),
			tipo: z.literal('aprofundamento'),
			menu: z.string().optional(),
			titulo: z.string().optional(),
			pagina: z.string(),
			linkTexto: z.string(),
		}),
		z.object({
			variante: z.string(),
			tipo: z.literal('perguntas'),
			menu: z.string().optional(),
			titulo: z.string().optional(),
		}),
		z.object({
			variante: z.string(),
			tipo: z.literal('convite'),
			ancora: z.string().optional(),
			botao: z.string(),
			botaoRotulo: z.string().optional(),
		}),
	]),
});

const perguntas = defineCollection({
	loader: loader('perguntas-das-copies', async (ctx) => {
		ctx.store.clear();
		const markdown = await readFile(new URL('perguntas.md', pastaCopy(ctx)), 'utf-8');
		for (const [indice, { pergunta, resposta }] of lerPerguntas(markdown).entries()) {
			const id = String(indice + 1).padStart(2, '0');
			ctx.store.set({
				id,
				data: await ctx.parseData({ id, data: { pergunta, ordem: indice + 1 } }),
				body: resposta,
				rendered: await ctx.renderMarkdown(resposta),
			});
		}
	}),
	schema: z.object({ pergunta: z.string(), ordem: z.number() }),
});

// As copies 1 a 4 usam as mesmas páginas, de paginas.md, como usam a mesma FAQ. Uma copy com
// páginas próprias tem o seu paginas-<id>.md, com os campos a mais que os desenhos dessas páginas leem.
const paginas = defineCollection({
	loader: loader('paginas-das-copies', async (ctx) => {
		ctx.store.clear();
		const pasta = pastaCopy(ctx);
		const comuns = await readFile(new URL('paginas.md', pasta), 'utf-8');
		for (const { id: variante } of await lerCopies(pasta)) {
			const markdown = await readFile(new URL(`paginas-${variante}.md`, pasta), 'utf-8').catch(() => comuns);
			for (const { titulo, campos } of lerBlocos(markdown)) {
				if (!titulo.startsWith('Página')) continue;
				const nome = titulo.split('·')[1]?.trim() ?? '';
				const corpo = campos.texto ?? '';
				const id = `${variante}/${slug(nome)}`;
				ctx.store.set({
					id,
					data: await ctx.parseData({
						id,
						data: {
							variante,
							titulo: campos.titulo,
							descricao: campos.descricao,
							rotulo: campos.rotulo,
							abertura: campos.abertura,
							alquimia: campos.alquimia,
							partes: cards(campos.partes),
							lugares: lista(campos.lugares),
							lados: lista(campos.lados),
							trechos: cards(campos.trechos),
							formacoes: lista(campos['formacoes-complementares']),
						},
					}),
					body: corpo,
					rendered: await ctx.renderMarkdown(corpo),
				});
			}
		}
	}),
	schema: z.object({
		variante: z.string(),
		titulo: z.string(),
		descricao: z.string(),
		rotulo: z.string().optional(),
		abertura: z.string().optional(),
		alquimia: z.string().optional(),
		partes: z.array(z.object({ titulo: z.string(), texto: z.string() })),
		lugares: z.array(z.string()),
		lados: z.array(z.string()),
		trechos: z.array(z.object({ titulo: z.string(), texto: z.string() })),
		formacoes: z.array(z.string()),
	}),
});

export const collections = { secoes, perguntas, paginas };
