import { defineConfig } from 'vitest/config';

// Tests live next to the code in lib/ and in test/. Never under pages/: Next.js would turn every file
// there into a route and deploy it. .next holds build output, which is not tested.
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['node_modules', '.next'],
  },
});
