import { defineConfig } from 'vitest/config';

// Quality evaluations against the real models (test/eval). They spend OpenAI tokens, so `npm test` skips them.
export default defineConfig({
  test: {
    include: ['test/eval/**/*.eval.ts'],
  },
});
