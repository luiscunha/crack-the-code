import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },
  ...tseslint.configs.recommended,
  {
    // Regra inegociável: geração determinística. O motor só usa o PRNG com seed.
    files: ['packages/engine/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Math.random() is forbidden in the engine. Use the seeded PRNG (mulberry32).',
        },
      ],
    },
  },
);
