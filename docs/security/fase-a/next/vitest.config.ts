import { defineConfig } from 'vitest/config';
export default defineConfig({test:{environment:'node',include:['docs/security/fase-a/next/tests/*.test.ts']}});