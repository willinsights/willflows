import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', setupFiles: [], include: ['docs/security/retencao-privada/*.test.ts'] } });