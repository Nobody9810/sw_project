import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks, '@typescript-eslint': tseslint.plugin },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-imports': ['error', {
        paths: ['antd', '@ant-design/icons', 'react-share', 'react-icons', 'lucide'],
        patterns: [{ group: ['antd/*', '@ant-design/*', '@fortawesome/*', 'react-icons/*', 'lucide/*'], message: '站点界面图标统一使用 lucide-react。' }],
      }],
    },
  },
]
