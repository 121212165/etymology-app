import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat();

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  ...compat.extends("eslint-config-next/core-web-vitals"),
  ...compat.extends("eslint-config-next/typescript"),
];

export default eslintConfig;
