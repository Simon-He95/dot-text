// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: [
      // eslint ignore globs here
      'dist/**',
      'playground/shims.d.ts',
    ],
  },
  {
    rules: {
      // overrides
      'no-restricted-syntax': 'off',
    },
  },
)
