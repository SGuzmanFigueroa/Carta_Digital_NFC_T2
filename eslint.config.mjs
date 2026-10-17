import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Los tests corren con node:test en CommonJS (require es lo correcto ahí).
  {
    files: ["tests/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@next/next/no-assign-module-variable": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Exportaciones de Figma: referencia de diseño, no código de la app.
    "figma_exports/**",
    // Componentes huérfanos (nadie los importa) que el equipo elimina en la
    // Tarea 26. Cuando se borren, quitar estas líneas.
    "src/components/CentralPedidos.tsx",
    "src/components/Configuracion.tsx",
    "src/components/GestionUsuarios.tsx",
    "src/components/NativeARModelViewer.tsx",
    "src/components/menu/ARBanner.tsx",
    "src/components/menu/CategoryTabs.tsx",
    "src/components/menu/MenuHeader.tsx",
    "src/components/menu/ProductCard.tsx",
    "src/components/menu/SearchBar.tsx",
  ]),
]);

export default eslintConfig;
