# filmcameradirectory

A Vite + React single-page app: a browsable directory of classic film cameras with search and type filtering.

## Cursor Cloud specific instructions

- Stack: Vite 5 + React 18. Scripts live in `package.json` (`dev`, `build`, `preview`, `lint`, `test`). Use those rather than re-deriving commands.
- Dev server: `npm run dev` serves at `http://localhost:5173` with hot-module-reload. `vite.config.js` sets `server.host: true`, so it also binds on the VM network IP.
- Tests: `npm test` runs Vitest (jsdom) once. `vite.config.js` holds the Vitest config; `src/test/setup.js` wires up `@testing-library/jest-dom`.
- Lint: `npm run lint` (flat-config is not used; ESLint reads `.eslintrc.cjs`).
- Camera content is static seed data in `src/data/cameras.js` — there is no backend, database, or API to start.
