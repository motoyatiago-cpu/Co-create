import { defineConfig } from '@playwright/test';
import baseline from './playwright.config';
// Test this worktree's production build, never the existing development server on 4175.
export default defineConfig({
  ...baseline,
  use: { ...baseline.use, baseURL: 'http://127.0.0.1:4186' },
  projects: baseline.projects!.flatMap(project => [
    { ...project, grepInvert: /45人容量/ },
    { ...project, name: `${project.name}-capacity`, testMatch: 'site.spec.ts', grep: /45人容量/,
      use: { ...project.use, baseURL: 'http://127.0.0.1:4188' } },
  ]),
  webServer: [{
    command: 'npm run preview -- --port 4186 --strictPort',
    url: 'http://127.0.0.1:4186', reuseExistingServer: false,
  }, {
    // The existing capacity HTML imports TSX source and is not a production entry.
    command: 'npm run dev -- --port 4188 --strictPort',
    url: 'http://127.0.0.1:4188', reuseExistingServer: false,
  }],
});
