import { describe, expect, it } from 'vitest';
import { chaveVersionada, gravarGuardado, lerGuardado, ligado, preferencia, type Armazenamento } from '../src/scripts/preferencias';

function memoria(inicial: Record<string, string> = {}): Armazenamento & { dados: Map<string, string> } {
	const dados = new Map(Object.entries(inicial));
	return {
		dados,
		getItem: (chave) => dados.get(chave) ?? null,
		setItem: (chave, valor) => void dados.set(chave, valor),
	};
}

const quebrado: Armazenamento = {
	getItem: () => {
		throw new Error('bloqueado');
	},
	setItem: () => {
		throw new Error('cheio');
	},
};

describe('chaves versionadas', () => {
	it('prefixam a versão', () => {
		expect(chaveVersionada('troca-botao')).toBe('v2:troca-botao');
	});

	it('gravam e leem pela chave versionada', () => {
		const armazenamento = memoria();
		gravarGuardado('troca-botao', 'cheio', armazenamento);
		expect(armazenamento.dados.get('v2:troca-botao')).toBe('cheio');
		expect(lerGuardado('troca-botao', armazenamento)).toBe('cheio');
	});

	it('ignoram o que foi guardado por uma versão antiga', () => {
		expect(lerGuardado('troca-botao', memoria({ 'v1:troca-botao': 'negrito' }))).toBeNull();
	});
});

describe('sem onde guardar', () => {
	it('a leitura devolve null em vez de quebrar', () => {
		expect(lerGuardado('troca-botao', quebrado)).toBeNull();
		expect(lerGuardado('troca-botao', null)).toBeNull();
	});

	it('a gravação não lança erro', () => {
		expect(() => gravarGuardado('troca-botao', 'fio', quebrado)).not.toThrow();
		expect(() => gravarGuardado('troca-botao', 'fio', null)).not.toThrow();
	});
});

describe('preferencia', () => {
	const guardado = memoria({ 'v2:troca-botao': 'negrito' });

	it('o endereço ganha do guardado', () => {
		const busca = new URLSearchParams('botao=cheio');
		expect(preferencia('botao', 'fio', { busca, armazenamento: guardado })).toBe('cheio');
	});

	it('o guardado ganha do padrão', () => {
		expect(preferencia('botao', 'fio', { busca: new URLSearchParams(), armazenamento: guardado })).toBe('negrito');
	});

	it('sem endereço e sem guardado, vale o padrão', () => {
		expect(preferencia('botao', 'fio', { busca: new URLSearchParams(), armazenamento: memoria() })).toBe('fio');
	});

	it('aceita outra chave de armazenamento', () => {
		const armazenamento = memoria({ 'v2:trocas-visiveis': '1' });
		expect(preferencia('seletores', '0', { busca: new URLSearchParams(), armazenamento }, 'trocas-visiveis')).toBe('1');
	});
});

describe('ligado', () => {
	it('só "0" desliga', () => {
		expect(ligado('0')).toBe(false);
		expect(ligado('1')).toBe(true);
		expect(ligado('')).toBe(true);
		expect(ligado(null)).toBe(true);
		expect(ligado(undefined)).toBe(true);
	});
});
