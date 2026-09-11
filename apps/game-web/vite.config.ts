import { cpSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const publishedWeb = resolve(repoRoot, 'art/published-web');

function publishedWebModels() {
  return {
    name: 'published-web-models',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: { url?: string }, res: { setHeader(name: string, value: string): void; statusCode: number }, next: () => void) => void) => void } }) {
      server.middlewares.use('/models', (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '').replace(/^\/+/, '');
        if (!rel || rel.includes('..')) {
          next();
          return;
        }
        const file = resolve(publishedWeb, rel);
        if (!file.startsWith(publishedWeb) || !existsSync(file) || !statSync(file).isFile()) {
          next();
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'model/gltf-binary');
        (res as unknown as { end: (body: Buffer) => void }).end(readFileSync(file));
      });
    },
    closeBundle() {
      if (!existsSync(publishedWeb)) return;
      const dest = resolve(here, 'dist/models');
      mkdirSync(dest, { recursive: true });
      cpSync(publishedWeb, dest, { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [publishedWebModels()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2023',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
