// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      'no-restricted-imports': [
        'error',
        {
          name: 'zod',
          message:
            "Import { z } from '#/lib/zod': it turns on jitless mode, which the CSP needs.",
        },
      ],
    },
  },
  {
    files: ['src/lib/zod.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'src/paraglide/**',
      'src/routeTree.gen.ts',
      'storybook-static/**',
      'dist/**',
      'dist-ssr/**',
    ],
  },
  ...storybook.configs['flat/recommended'],
]
