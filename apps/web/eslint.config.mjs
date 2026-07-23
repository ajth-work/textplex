import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"],
    rules: {
      // Existing data-loading effects intentionally reset local UI state before async work.
      "react-hooks/set-state-in-effect": "off",
      // Preserve the current manual memoization until the reader state model is simplified.
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];
