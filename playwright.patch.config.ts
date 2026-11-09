import { defineConfig } from '@playwright/test';
import baseline from './playwright.config';
export default defineConfig({
  ...baseline,
  use: { ...baseline.use, baseURL: 'http://127.0.0.1:4192' },
  projects: baseline.projects!.flatMap(project => [
    { ...project, grepInvert: /45人容量/ },
    { ...project, name: `${project.name}-review`, testMatch: '**/member-review.spec.ts', use: { ...project.use, baseURL: 'http://127.0.0.1:4191' } },
    { ...project, name: `${project.name}-capacity`, testMatch: '**/site.spec.ts', grep: /45人容量/, use: { ...project.use, baseURL: 'http://127.0.0.1:4191' } },
  ]),
  webServer: [
    { command: 'npm run preview -- --port 4192 --strictPort', url: 'http://127.0.0.1:4192', reuseExistingServer: false },
    { command: 'npm run dev -- --config vite.review.config.mjs --port 4191 --strictPort', url: 'http://127.0.0.1:4191', reuseExistingServer: false },
  ],
});
