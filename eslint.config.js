// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const simpleImportSort = require('eslint-plugin-simple-import-sort');

const sortComponentImports = require('./tools/eslint-rules/sort-component-imports.js');

module.exports = defineConfig([
  // =========================================================
  // 1. TypeScript + Angular
  // =========================================================
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        // Bật typed linting cho các rule cần thông tin kiểu.
        projectService: true,
      },
    },
    rules: {
      // -------------------------------------------------------
      // JavaScript / TypeScript cơ bản
      // -------------------------------------------------------
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      // Chuẩn hóa cách khai báo kiểu.
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      // Không ghi type không cần thiết, ví dụ: const count: number = 1.
      '@typescript-eslint/no-inferrable-types': 'error',
      // Cảnh báo khi dùng non-null assertion: user!.name.
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // -------------------------------------------------------
      // Type-aware rules: cần projectService
      // -------------------------------------------------------
      // Promise bị bỏ quên, không await hoặc không xử lý.
      '@typescript-eslint/no-floating-promises': 'error',
      // Không truyền Promise vào nơi cần callback đồng bộ.
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: true,
        },
      ],
      // Phát hiện điều kiện luôn đúng hoặc luôn sai theo kiểu.
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      // Bắt buộc xử lý đầy đủ các nhánh union/enum trong switch.
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // Chuẩn hóa export type.
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],
      // -------------------------------------------------------
      // Angular component / directive
      // -------------------------------------------------------
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/no-empty-lifecycle-method': 'error',
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },

  // =========================================================
  // 2. Domain architecture restriction
  // =========================================================
  {
    files: ['src/app/core/domain/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/*', 'dexie', 'rxjs', 'rxjs/*'],
              message: 'Domain phải là TypeScript thuần.',
            },
            {
              group: ['**/data/*', '**/notifications/*', '**/features/*', '**/shared/*', '**/layout/*', '**/theme/*'],
              message: 'Domain không được import tầng trên.',
            },
          ],
        },
      ],
    },
  },

  // =========================================================
  // 3. Feature cross-import restriction
  // =========================================================
  {
    files: ['src/app/features/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../features/*', '../*/*.page'],
              message: 'Không import chéo giữa các feature.',
            },
          ],
        },
      ],
    },
  },

  // =========================================================
  // 4. ZardUI copied-source exceptions
  // =========================================================
  {
    files: ['src/app/shared/components/**/*.ts', 'src/app/shared/core/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',
      eqeqeq: 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // =========================================================
  // 5. Import / export sorting
  // =========================================================
  {
    files: ['**/*.ts', '**/*.js', '**/*.mjs'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // =========================================================
  // 6. Custom rule: sort @Component imports
  // =========================================================
  {
    files: ['**/*.ts'],
    plugins: {
      local: {
        rules: {
          'sort-component-imports': sortComponentImports,
        },
      },
    },

    rules: {
      'local/sort-component-imports': 'error',
    },
  },
]);
