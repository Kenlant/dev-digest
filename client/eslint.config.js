// @ts-check
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", ".next/**", "next-env.d.ts"] },
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      // "error", not "warn": `pnpm lint` only started running in CI alongside
      // this change, and as a warning this rule had already let a real wrong
      // dependency array sit in pulls/[number]/page.tsx. Deliberate exceptions
      // use an inline eslint-disable with a comment saying why (see
      // lib/hooks/reviews.ts's useRunEvents).
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
