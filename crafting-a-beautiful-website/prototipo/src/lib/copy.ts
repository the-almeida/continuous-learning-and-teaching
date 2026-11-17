// Lê as copies de ../copy/*.md. Cada "## " é uma seção (ou, em paginas.md, uma página,
// "## Página · Nome") e cada "### " é um campo. O que vem antes do primeiro "## " são notas e fica de fora.
import { readdir, readFile } from 'node:fs/promises';

export type Campos = Record<string, string>;

export interface Bloco {
	titulo: string;
	campos: Campos;
}

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

export const slug = (texto: string) =>
	semAcento(texto)
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

export function lerBlocos(markdown: string): Bloco[] {
	return markdown
		.split(/^## /m)
		.slice(1)
		.map((parte) => {
			const [cabeca = '', ...resto] = parte.split('\n');
			const campos: Campos = {};
			for (const campo of resto.join('\n').split(/^### /m).slice(1)) {
				const [nome = '', ...texto] = campo.split('\n');
				campos[slug(nome)] = texto.join('\n').trim();
			}
			return { titulo: cabeca.trim(), campos };
		});
}

// Perguntas: "## Pergunta" seguido da resposta.
export function lerPerguntas(markdown: string) {
	return markdown
		.split(/^## /m)
		.slice(1)
		.map((parte) => {
			const [pergunta = '', ...resposta] = parte.split('\n');
			return { pergunta: pergunta.trim(), resposta: resposta.join('\n').replace(/\*\*\(sem fala dela\)\*\*/g, '').trim() };
		});
}

export const lista = (texto = '') =>
	texto
		.split('\n')
		.filter((linha) => linha.startsWith('- '))
		.map((linha) => linha.slice(2).trim());

// Cada parágrafo de um card fica separado por uma linha em branco, para o componente poder quebrar em <p>.
export const cards = (texto = '') =>
	texto
		.split(/^#### /m)
		.slice(1)
		.map((card) => {
			const [titulo = '', ...resto] = card.split('\n');
			return { titulo: titulo.trim(), texto: paragrafos(resto.join('\n')).join('\n\n') };
		});

export const paragrafos = (texto = '') =>
	texto
		.split(/\n\s*\n/)
		.map((parte) => parte.replace(/\s+/g, ' ').trim())
		.filter(Boolean);

// As variações da abertura: cada "#### Nome" com "**Título:**", "**Texto:**" e "**Frase:**". Uma variação sem
// nenhum desses campos é a abertura principal, com os campos da própria seção.
export const variacoes = (texto = '') =>
	texto
		.split(/^#### /m)
		.slice(1)
		.map((bloco) => {
			const [nome = '', ...resto] = bloco.split('\n');
			const corpo = resto.join('\n');
			const campo = (rotulo: string) => corpo.match(new RegExp(`\\*\\*${rotulo}:\\*\\*\\s*(.+)`))?.[1]?.trim();
			return { nome: nome.trim(), headline: campo('Título'), texto: campo('Texto'), frase: campo('Frase') };
		});

// O texto completo da trajetória em blocos: cada "#### Rótulo" abre um bloco, com parágrafos e listas. O que vem
// antes do primeiro rótulo é um bloco sem rótulo.
export function blocosDeTexto(texto = '') {
	const [antes = '', ...rotulados] = texto.split(/^#### /m);
	const partes = [{ rotulo: '', corpo: antes }, ...rotulados.map((parte) => {
		const [rotulo = '', ...resto] = parte.split('\n');
		return { rotulo: rotulo.trim(), corpo: resto.join('\n') };
	})];
	return partes
		.filter(({ rotulo, corpo }) => rotulo || corpo.trim())
		.map(({ rotulo, corpo }) => ({
			rotulo,
			itens: corpo
				.split(/\n\s*\n/)
				.map((trecho) => trecho.trim())
				.filter(Boolean)
				.map((trecho) =>
					trecho.split('\n').every((linha) => linha.startsWith('- '))
						? { lista: lista(trecho) }
						: { paragrafo: trecho.replace(/\s+/g, ' ') },
				),
		}));
}

// Campos em texto corrido (cards, partes das páginas) com **negrito** e [links](url), sem passar pelo markdown.
// Um link relativo ganha a base da versão: "saberes-complementares/" vira "/e/5/saberes-complementares/".
export const comNegrito = (texto: string, base = '') =>
	texto
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\[(.+?)\]\((.+?)\)/g, (_, rotulo, href) => `<a href="${/^(https?:|\/|#)/.test(href) ? href : base + href}">${rotulo}</a>`);

// "Formação em X (A, B), Instituição" → ['Formação em X (A, B)', 'Instituição']. Só a vírgula fora de parênteses separa.
export function separarFormacao(item: string): [string, string] {
	let nivel = 0;
	for (const [indice, letra] of [...item].entries()) {
		if (letra === '(') nivel++;
		if (letra === ')') nivel--;
		if (letra === ',' && nivel === 0) return [item.slice(0, indice), item.slice(indice + 1).trim()];
	}
	return [item, ''];
}

// "1-encontro.md" → { id: '1', nome: 'encontro' }
export async function lerCopies(pasta: URL) {
	const arquivos = (await readdir(pasta)).filter((nome) => /^\d-.+\.md$/.test(nome)).sort();
	return Promise.all(
		arquivos.map(async (arquivo) => ({
			id: arquivo.slice(0, 1),
			markdown: await readFile(new URL(arquivo, pasta), 'utf-8'),
		})),
	);
}
