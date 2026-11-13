import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['docs/security/g04-s03/revised/positive.test.ts'], setupFiles: [] } });