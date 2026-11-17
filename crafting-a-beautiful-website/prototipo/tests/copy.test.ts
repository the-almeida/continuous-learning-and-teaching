import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
	blocosDeTexto,
	cards,
	comNegrito,
	lerBlocos,
	lerCopies,
	lerPerguntas,
	lista,
	paragrafos,
	separarFormacao,
	slug,
	variacoes,
} from '../src/lib/copy';

describe('slug', () => {
	it('tira acentos, passa para minúsculas e troca o resto por hífen', () => {
		expect(slug('Saúde da mulher')).toBe('saude-da-mulher');
		expect(slug('  Quem te escuta?  ')).toBe('quem-te-escuta');
		expect(slug('Citação autora')).toBe('citacao-autora');
	});

	it('não deixa hífen sobrando nas pontas', () => {
		expect(slug('— Abertura —')).toBe('abertura');
		expect(slug('01 · Abertura')).toBe('01-abertura');
	});
});

describe('lerBlocos', () => {
	const markdown = [
		'# Copy de teste',
		'',
		'Notas que não aparecem no site.',
		'',
		'## 01 · Abertura',
		'',
		'### Título',
		'',
		'Um convite ao encontro.',
		'',
		'### Botão',
		'',
		'Fale comigo',
		'',
		'## 02 · Abordagem',
		'',
		'### Texto',
		'',
		'Primeiro parágrafo.',
		'',
		'Segundo parágrafo.',
	].join('\n');

	it('ignora tudo antes do primeiro "## "', () => {
		const blocos = lerBlocos(markdown);
		expect(blocos.map((bloco) => bloco.titulo)).toEqual(['01 · Abertura', '02 · Abordagem']);
	});

	it('transforma cada "### " num campo, com o nome em slug', () => {
		const [abertura, abordagem] = lerBlocos(markdown);
		expect(abertura?.campos).toEqual({ titulo: 'Um convite ao encontro.', botao: 'Fale comigo' });
		expect(abordagem?.campos.texto).toBe('Primeiro parágrafo.\n\nSegundo parágrafo.');
	});

	it('devolve uma lista vazia quando não há seção', () => {
		expect(lerBlocos('# Só notas\n\nnada aqui')).toEqual([]);
	});
});

describe('lerPerguntas', () => {
	it('separa a pergunta da resposta e tira a marca de rascunho', () => {
		const perguntas = lerPerguntas(
			['# FAQ', '', '## O atendimento é sigiloso?', '', 'Sim, tudo fica entre nós. **(sem fala dela)**', '', '## Quanto dura?', '', '50 minutos.'].join('\n'),
		);
		expect(perguntas).toEqual([
			{ pergunta: 'O atendimento é sigiloso?', resposta: 'Sim, tudo fica entre nós.' },
			{ pergunta: 'Quanto dura?', resposta: '50 minutos.' },
		]);
	});
});

describe('lista', () => {
	it('pega só as linhas que começam com "- "', () => {
		expect(lista('Introdução\n- Ciclo menstrual\n- Gestação\n\n-sem espaço')).toEqual(['Ciclo menstrual', 'Gestação']);
	});

	it('aceita campo ausente', () => {
		expect(lista()).toEqual([]);
	});
});

describe('paragrafos', () => {
	it('quebra na linha em branco e junta as quebras simples', () => {
		expect(paragrafos('Uma frase\ncontinua aqui.\n\n  \nOutra frase.')).toEqual(['Uma frase continua aqui.', 'Outra frase.']);
	});

	it('não devolve parágrafo vazio', () => {
		expect(paragrafos('\n\n\n')).toEqual([]);
	});
});

describe('cards', () => {
	it('abre um card a cada "#### " e separa os parágrafos com linha em branco', () => {
		const resultado = cards('Ignorado\n#### Sistêmica\nPrimeira linha\ncontinua.\n\nSegundo.\n#### Trauma\nTexto do trauma.');
		expect(resultado).toEqual([
			{ titulo: 'Sistêmica', texto: 'Primeira linha continua.\n\nSegundo.' },
			{ titulo: 'Trauma', texto: 'Texto do trauma.' },
		]);
	});
});

describe('variacoes', () => {
	it('lê os campos de cada variação da abertura', () => {
		const resultado = variacoes(
			['#### Principal', '', '#### Pergunta', '**Título:** Como você está?', '**Texto:** Um texto curto.', '**Frase:** Uma frase.'].join('\n'),
		);
		expect(resultado).toEqual([
			{ nome: 'Principal', headline: undefined, texto: undefined, frase: undefined },
			{ nome: 'Pergunta', headline: 'Como você está?', texto: 'Um texto curto.', frase: 'Uma frase.' },
		]);
	});
});

describe('blocosDeTexto', () => {
	it('separa o bloco sem rótulo dos rotulados, com parágrafos e listas', () => {
		const resultado = blocosDeTexto(
			['Abertura do texto,', 'em duas linhas.', '', '#### Hoje', '', 'Um parágrafo.', '', '- item um', '- item dois'].join('\n'),
		);
		expect(resultado).toEqual([
			{ rotulo: '', itens: [{ paragrafo: 'Abertura do texto, em duas linhas.' }] },
			{ rotulo: 'Hoje', itens: [{ paragrafo: 'Um parágrafo.' }, { lista: ['item um', 'item dois'] }] },
		]);
	});

	it('descarta o bloco inicial vazio', () => {
		expect(blocosDeTexto('#### Só rotulado\nTexto.')).toEqual([{ rotulo: 'Só rotulado', itens: [{ paragrafo: 'Texto.' }] }]);
	});
});

describe('comNegrito', () => {
	it('escapa HTML antes de aplicar o negrito', () => {
		expect(comNegrito('<b>A & B</b> e **forte**')).toBe('&lt;b>A &amp; B&lt;/b> e <strong>forte</strong>');
	});

	it('dá a base da versão só aos links relativos', () => {
		const base = '/e/5/';
		expect(comNegrito('[Saberes](saberes-complementares/)', base)).toBe('<a href="/e/5/saberes-complementares/">Saberes</a>');
		expect(comNegrito('[Início](/)', base)).toBe('<a href="/">Início</a>');
		expect(comNegrito('[Âncora](#faq)', base)).toBe('<a href="#faq">Âncora</a>');
		expect(comNegrito('[Fora](https://example.com)', base)).toBe('<a href="https://example.com">Fora</a>');
	});
});

describe('separarFormacao', () => {
	it('separa o curso da instituição na última vírgula fora de parênteses', () => {
		expect(separarFormacao('Formação em Terapia Sistêmica (Indivíduo, Conjugalidade e Família), Centro de Formação Exemplo')).toEqual([
			'Formação em Terapia Sistêmica (Indivíduo, Conjugalidade e Família)',
			'Centro de Formação Exemplo',
		]);
	});

	it('devolve a instituição vazia quando não há vírgula de fora', () => {
		expect(separarFormacao('Formação em Psicotraumatologia (curso livre)')).toEqual(['Formação em Psicotraumatologia (curso livre)', '']);
	});
});

describe('lerCopies', () => {
	let pasta = '';

	afterEach(async () => {
		if (pasta) await rm(pasta, { recursive: true, force: true });
	});

	it('lê só os arquivos "<número>-<nome>.md", em ordem, com o número como id', async () => {
		pasta = await mkdtemp(join(tmpdir(), 'copies-'));
		await writeFile(join(pasta, '2-pontes.md'), '## Dois');
		await writeFile(join(pasta, '1-encontro.md'), '## Um');
		await writeFile(join(pasta, 'paginas.md'), '## Fora');
		await writeFile(join(pasta, 'rascunho.txt'), 'fora');
		const copies = await lerCopies(pathToFileURL(`${pasta}/`));
		expect(copies).toEqual([
			{ id: '1', markdown: '## Um' },
			{ id: '2', markdown: '## Dois' },
		]);
	});
});
