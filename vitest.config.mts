import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // `import "server-only"` lanza un error si se resuelve tal cual fuera
      // de Next.js (su condición "react-server" no aplica en Node/Vitest).
      // Se alía al propio `empty.js` (no-op) que el paquete ya trae para
      // ese caso, así los módulos con lógica pura marcados `server-only`
      // (p.ej. src/lib/network/allowed-ip.ts) se pueden testear sin quitar
      // esa marca de seguridad del código real.
      "server-only": path.resolve(
        import.meta.dirname,
        "./node_modules/server-only/empty.js",
      ),
    },
  },
  test: {
    environment: "node",
  },
});
