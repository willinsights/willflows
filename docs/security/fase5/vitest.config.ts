import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', setupFiles: [], include: ['docs/security/fase5/*.test.ts'] } });