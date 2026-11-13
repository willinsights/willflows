import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/lib/__tests__/videoSecurityCandidate.test.ts'], setupFiles: [] } });