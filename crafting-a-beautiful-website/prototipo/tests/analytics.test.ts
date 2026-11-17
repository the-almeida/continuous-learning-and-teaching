// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	MARCOS_DE_ROLAGEM,
	criarEnvio,
	eventoDoClique,
	lugarDoClique,
	marcosNovos,
	nomeDaSecao,
	porcentagemRolada,
	somarLeitura,
	textoDoAlvo,
} from '../src/scripts/analytics';

const elemento = (seletor: string) => {
	const el = document.querySelector(seletor);
	if (!el) throw new Error(`faltou ${seletor} no HTML do teste`);
	return el;
};

describe('porcentagemRolada', () => {
	it('mede quanto da parte rolável já passou', () => {
		expect(porcentagemRolada(0, 3000, 1000)).toBe(0);
		expect(porcentagemRolada(1000, 3000, 1000)).toBe(50);
		expect(porcentagemRolada(2000, 3000, 1000)).toBe(100);
	});

	it('conta como inteira a página que cabe na tela', () => {
		expect(porcentagemRolada(0, 800, 1000)).toBe(100);
	});
});

describe('marcosNovos', () => {
	it('solta cada marco uma vez só, com dois pontos de folga', () => {
		const vistos = new Set<number>();
		expect(marcosNovos(24, MARCOS_DE_ROLAGEM, vistos)).toEqual([25]);
		expect(marcosNovos(30, MARCOS_DE_ROLAGEM, vistos)).toEqual([]);
		expect(marcosNovos(98, MARCOS_DE_ROLAGEM, vistos)).toEqual([50, 75, 100]);
		expect(marcosNovos(100, MARCOS_DE_ROLAGEM, vistos)).toEqual([]);
	});
});

describe('somarLeitura', () => {
	it('soma um segundo por seção e avisa quando bate um marco', () => {
		const lidos = new Map<string, number>([['abordagem', 4]]);
		expect(somarLeitura(lidos, ['abordagem', 'convite'])).toEqual([{ secao: 'abordagem', segundos: 5 }]);
		expect(lidos.get('convite')).toBe(1);
	});

	it('conta uma vez a seção que aparece repetida no mesmo segundo', () => {
		const lidos = new Map<string, number>();
		somarLeitura(lidos, ['o-que-nos-adoece', 'o-que-nos-adoece']);
		expect(lidos.get('o-que-nos-adoece')).toBe(1);
	});
});

describe('no DOM', () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<header class="cabecalho">
				<a class="marca" href="#inicio">Nome</a>
				<details class="menu-celular"><summary>Menu</summary><div class="menu-cheio"><a href="#abordagem">Abordagem</a></div></details>
			</header>
			<main>
				<section id="abordagem"><button aria-expanded="false" aria-label="Ler a  abordagem">+</button></section>
				<figure id="o-que-nos-adoece-texto"><a href="mailto:oi@example.com">Escreva</a></figure>
				<section id="perguntas-frequentes">
					<details class="pergunta"><summary>É sigiloso?</summary><p>Sim.</p></details>
					<details class="trajetoria" open><summary>Trajetória</summary></details>
				</section>
				<article class="pagina-saude"><div data-secao="ciclos"><a href="/e/5/">Voltar</a></div><p><a href="https://example.com">Fora</a></p></article>
			</main>
			<footer class="rodape"><a href="/e/5/#convite">Contato</a></footer>
		`;
	});

	it('textoDoAlvo prefere o aria-label e junta os espaços', () => {
		expect(textoDoAlvo(elemento('button'))).toBe('Ler a abordagem');
		expect(textoDoAlvo(document.createElement('span'))).toBe('');
	});

	it('nomeDaSecao usa o data-secao, depois o id sem "-texto", depois a classe', () => {
		expect(nomeDaSecao(elemento('[data-secao]') as HTMLElement)).toBe('ciclos');
		expect(nomeDaSecao(elemento('figure') as HTMLElement)).toBe('o-que-nos-adoece');
		expect(nomeDaSecao(elemento('article') as HTMLElement)).toBe('pagina-saude');
	});

	it('lugarDoClique separa o menu em tela cheia do cabeçalho', () => {
		expect(lugarDoClique(elemento('.menu-cheio a'))).toBe('menu-cheio');
		expect(lugarDoClique(elemento('.marca'))).toBe('menu');
		expect(lugarDoClique(elemento('.rodape a'))).toBe('rodape');
		expect(lugarDoClique(elemento('#abordagem button'))).toBe('abordagem');
		expect(lugarDoClique(elemento('[data-secao] a'))).toBe('ciclos');
		expect(lugarDoClique(elemento('article p a'))).toBe('pagina-saude');
	});

	it('na FAQ, só abrir uma pergunta conta', () => {
		const pergunta = elemento('.pergunta summary');
		expect(eventoDoClique(pergunta, '/e/5/')?.nome).toBe('pergunta');
		(pergunta.parentElement as HTMLDetailsElement).open = true;
		expect(eventoDoClique(pergunta, '/e/5/')).toBeNull();
	});

	it('um <details> aberto vai fechar', () => {
		expect(eventoDoClique(elemento('.trajetoria summary'), '/')?.nome).toBe('fechar');
	});

	it('o botão com aria-expanded diz se abre ou fecha', () => {
		const botao = elemento('#abordagem button');
		expect(eventoDoClique(botao, '/')?.nome).toBe('abrir');
		botao.setAttribute('aria-expanded', 'true');
		expect(eventoDoClique(botao, '/')?.nome).toBe('fechar');
	});

	it('classifica os links e guarda o destino', () => {
		expect(eventoDoClique(elemento('figure a'), '/')).toEqual({
			nome: 'email',
			dados: { pagina: '/', lugar: 'o-que-nos-adoece', alvo: 'Escreva', destino: 'mailto:oi@example.com' },
		});
		expect(eventoDoClique(elemento('.rodape a'), '/')?.nome).toBe('ancora');
		expect(eventoDoClique(elemento('article p a'), '/')?.nome).toBe('link');
	});
});

describe('criarEnvio', () => {
	it('guarda na fila até o Umami carregar e depois esvazia', () => {
		const janela = {} as Window;
		const { enviar, esvaziar, fila } = criarEnvio(janela, false);
		enviar('rolagem', { porcentagem: 25 });
		expect(fila).toHaveLength(1);
		expect(esvaziar()).toBe(false);

		const track = vi.fn();
		janela.umami = { track };
		expect(esvaziar()).toBe(true);
		expect(track).toHaveBeenCalledWith('rolagem', { porcentagem: 25 });
		expect(fila).toHaveLength(0);

		enviar('tempo', { segundos: 10 });
		expect(track).toHaveBeenLastCalledWith('tempo', { segundos: 10 });
	});

	it('no modo debug, mostra cada evento no console', () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		criarEnvio({} as Window, true).enviar('clique', { alvo: 'x' });
		expect(log).toHaveBeenCalledWith('[analytics]', 'clique', { alvo: 'x' });
	});
});
