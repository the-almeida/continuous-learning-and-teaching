// As escolhas de quem testa o protótipo (qual abertura, qual botão, liga/desliga). O endereço (?nome=valor) ganha do
// que ficou guardado no navegador, e o guardado ganha do padrão. As chaves têm versão ("v2:"): quando os padrões
// mudam, uma escolha antiga guardada não passa por cima deles.

export const VERSAO = 'v2';

export interface Armazenamento {
	getItem(chave: string): string | null;
	setItem(chave: string, valor: string): void;
}

// O próprio acesso ao localStorage pode lançar erro (aba anônima, cookies bloqueados), não só a leitura.
function armazenamentoDoNavegador(): Armazenamento | null {
	try {
		return globalThis.localStorage ?? null;
	} catch {
		return null;
	}
}

export const chaveVersionada = (chave: string) => `${VERSAO}:${chave}`;

export function lerGuardado(chave: string, armazenamento = armazenamentoDoNavegador()): string | null {
	if (!armazenamento) return null;
	try {
		return armazenamento.getItem(chaveVersionada(chave));
	} catch {
		return null;
	}
}

export function gravarGuardado(chave: string, valor: string, armazenamento = armazenamentoDoNavegador()): void {
	if (!armazenamento) return;
	try {
		armazenamento.setItem(chaveVersionada(chave), valor);
	} catch {
		// Sem onde guardar, a escolha vale só nesta visita.
	}
}

export interface OrigemDaPreferencia {
	busca: URLSearchParams;
	armazenamento?: Armazenamento | null;
}

// O valor de uma escolha: o do endereço, o guardado (com a chave "troca-<nome>" ou outra) ou o padrão.
export function preferencia(
	nome: string,
	padrao: string,
	{ busca, armazenamento = armazenamentoDoNavegador() }: OrigemDaPreferencia,
	chave = `troca-${nome}`,
): string {
	return busca.get(nome) ?? lerGuardado(chave, armazenamento) ?? padrao;
}

// Um liga/desliga: só "0" desliga, qualquer outro valor (ou nenhum) deixa ligado.
export const ligado = (valor: string | null | undefined) => valor !== '0';
