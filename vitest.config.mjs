import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  test: {
    environment: 'node',
    globals: true,
    include: ['src/lib/__tests__/*.test.ts'],
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
};
