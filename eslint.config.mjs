import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Spec 07: Motion components must come from "motion/react-m". Importing `m`/`motion` from the
    // "motion/react" barrel pulls every animation feature into the initial bundle (see e2e/bundle.spec.ts).
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "motion/react",
              importNames: ["m", "motion"],
              message: 'Use `import * as m from "motion/react-m"` so LazyMotion can keep features out of the initial bundle.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
