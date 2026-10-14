module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  env: { browser: true, node: true, es2022: true },
  plugins: ["react-hooks"],
  extends: ["eslint:recommended"],
  ignorePatterns: ["src/.umi/**", "src/.umi-production/**", "dist/**"],
  rules: {
    "no-undef": "off",
    "no-unused-vars": "off",
    "react-hooks/rules-of-hooks": "error",
    "no-eval": "error",
    "no-new-func": "error",
  },
};
