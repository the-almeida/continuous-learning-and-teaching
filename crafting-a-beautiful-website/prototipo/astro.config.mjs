// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// Protótipo das variações: 3 designs × 4 copies, lendo a copy de ../copy/*.md.
// As fontes são baixadas no build e servidas pelo próprio site, como vai ser em produção.
const google = fontProviders.google();

export default defineConfig({
	trailingSlash: 'always',
	compressHTML: true,
	devToolbar: { enabled: false },
	fonts: [
		{ name: 'Newsreader', cssVariable: '--fonte-a-titulo', provider: google, weights: [300, 400, 500], styles: ['normal', 'italic'], subsets: ['latin'], fallbacks: ['Georgia', 'serif'] },
		{ name: 'Figtree', cssVariable: '--fonte-a-texto', provider: google, weights: [400, 500, 600], styles: ['normal'], subsets: ['latin'], fallbacks: ['system-ui', 'sans-serif'] },
		{ name: 'Lora', cssVariable: '--fonte-b-titulo', provider: google, weights: [400, 500], styles: ['normal', 'italic'], subsets: ['latin'], fallbacks: ['Georgia', 'serif'] },
		{ name: 'Nunito Sans', cssVariable: '--fonte-b-texto', provider: google, weights: [400, 600], styles: ['normal'], subsets: ['latin'], fallbacks: ['system-ui', 'sans-serif'] },
		{ name: 'Gelasio', cssVariable: '--fonte-c-titulo', provider: google, weights: [400, 500, 600], styles: ['normal', 'italic'], subsets: ['latin'], fallbacks: ['Georgia', 'serif'] },
		{ name: 'Montserrat', cssVariable: '--fonte-c-texto', provider: google, weights: [400, 500, 600], styles: ['normal'], subsets: ['latin'], fallbacks: ['system-ui', 'sans-serif'] },
	],
});
