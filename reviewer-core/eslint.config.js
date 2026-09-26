// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Onion Architecture: this package is the pure core. The ONLY side effect
  // anywhere in it is the LLM call, and only through the injected LLMProvider
  // in src/llm/**. Its runtime dependency list (openai + zod) is an
  // architectural property, not an accident — see AGENTS.md and
  // .claude/skills/onion-architecture/SKILL.md.
  {
    files: ["src/**/*.ts"],
    ignores: ["src/llm/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "fs", message: "reviewer-core does no filesystem I/O." },
            { name: "node:fs", message: "reviewer-core does no filesystem I/O." },
            { name: "fs/promises", message: "reviewer-core does no filesystem I/O." },
            { name: "node:fs/promises", message: "reviewer-core does no filesystem I/O." },
            { name: "pg", message: "reviewer-core never touches a database." },
            { name: "postgres", message: "reviewer-core never touches a database." },
            { name: "drizzle-orm", message: "reviewer-core never touches a database." },
            { name: "octokit", message: "GitHub access belongs in server/src/adapters/github." },
            { name: "simple-git", message: "git access belongs in server/src/adapters/git." },
            { name: "undici", message: "The only network call is llm.completeStructured()." },
            { name: "axios", message: "The only network call is llm.completeStructured()." },
            {
              name: "openai",
              message:
                "Import the OpenAI SDK only inside src/llm/** — everything else " +
                "depends on the LLMProvider port.",
            },
          ],
          patterns: [
            {
              group: ["node:http*", "node:https*", "node:net", "node:dgram", "node:child_process"],
              message: "reviewer-core performs no I/O outside the injected LLMProvider.",
            },
          ],
        },
      ],
    },
  },
);
