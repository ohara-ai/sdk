import baseConfig from '@seriesfi/eslint-config'

const eslintConfig = [
  ...baseConfig,
  {
    ignores: [
      'bin',
      'dist',
      '**/dist/**',
      'node_modules',
      'contracts/out',
      'contracts/cache',
      'contracts/lib',
      'e2e-test',
      '**/*.config.mjs',
      '**/*.config.js',
      'scripts/**/*.js',
      'sdk/scripts/**/*.js',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
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
]

export default eslintConfig
