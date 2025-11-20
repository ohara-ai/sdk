import baseConfig from '@seriesfi/eslint-config'

const eslintConfig = [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname, // ensures ESLint resolves relative to your repo
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      'no-useless-catch': 'warn',
      'no-constant-condition': 'warn',
      'no-useless-escape': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-case-declarations': 'warn',
    },
  },
  {
    ignores: ['bin', 'eslint.config.mjs', 'prettier.config.mjs'],
  },
]

export default eslintConfig
