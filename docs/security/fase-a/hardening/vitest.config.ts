import { defineConfig } from 'vitest/config';
export default defineConfig({test:{environment:'node',setupFiles:[],include:['docs/security/fase-a/hardening/tests/*.test.ts']}});