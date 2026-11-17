export const DESIGNS = [
	{
		id: 'a',
		cor: '#4b6250',
		fundo: '#f3f2ee',
		nome: 'Folha',
		resumo: 'Cinza e neutro, com o verde vindo das fotos de plantas.',
		referencia: 'myeverroot.com',
	},
	{
		id: 'b',
		cor: '#6c5891',
		fundo: '#ffffff',
		nome: 'Lilás',
		resumo: 'Branco e limpo, com um lilás de leve e desenhos de traço no lugar das fotos.',
		referencia: 'relacoesemterapia.com.br',
	},
	{
		id: 'c',
		cor: '#ad5d3a',
		fundo: '#fbf9f6',
		nome: 'Amanhecer',
		resumo: 'Neutro claro com um único tom de sol e paisagens de amanhecer.',
		referencia: 'renatamiguez.com.br e anabeatrizweller.com.br',
	},
	{
		id: 'd',
		cor: '#ad5d3a',
		fundo: '#e6e5e2',
		nome: 'Horizonte',
		resumo: 'O Amanhecer em cinza e neutro: uma fonte só, com cara de livro, e o sol nascendo na linha do horizonte.',
		referencia: 'a mesma do C, mas aplicando o seu pedido de algo “mais cinza, mais neutro”',
	},
] as const;

export const COPIES = [
	{
		id: '1',
		nome: 'Encontro',
		resumo: 'Direta e curta, abre pelo encontro.',
		linha: 'Direta e curta: frases afirmativas, sem pergunta e sem metáfora. Abre pelo encontro.',
	},
	{
		id: '2',
		nome: 'Pontes',
		resumo: 'Calorosa, feita quase só das suas palavras.',
		linha: 'Calorosa e poética, feita quase só das suas palavras. Abre com a frase que você mais usa.',
	},
	{
		id: '3',
		nome: 'Olhar integrativo',
		resumo: 'Explica o olhar integrativo em palavras simples.',
		linha: 'Explicativa: cada frase de efeito vem com outra que diz o que é e como funciona. Abre pelo olhar integrativo.',
	},
	{
		id: '4',
		nome: 'Vínculos',
		resumo: 'A mais fiel ao seu texto escrito, com os títulos que você deu.',
		linha: 'O seu texto escrito, quase sem mudanças, com os títulos que você deu. Abre com o título do seu primeiro documento.',
	},
] as const;

// A segunda rodada: cada versão tem um endereço só, no design E. Ficam fora da grade de combinações
// (DESIGNS × COPIES), que continua igual à que ela viu.
export const DESIGN_NOVO = 'e';

export const VERSOES = [
	{
		copy: '5',
		nome: 'Vínculos',
		resumo: 'A Vínculos no design novo, com os ajustes do encontro 2.',
	},
] as const;

export type DesignId = (typeof DESIGNS)[number]['id'];
export type CopyId = (typeof COPIES)[number]['id'];

// "1/02-abordagem" → "abordagem"
export const ancoraDe = (id: string) => (id.split('/').pop() ?? id).replace(/^\d+-/, '');
