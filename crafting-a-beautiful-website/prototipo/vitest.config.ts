// Os testes rodam em Node. Os que mexem no DOM pedem o happy-dom no topo do arquivo (@vitest-environment happy-dom).
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		restoreMocks: true,
	},
});
