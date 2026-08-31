// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * A hex colour, an rgb()/rgba() call or an hsl() string written by hand.
 * Design tokens are the only place allowed to spell a colour out.
 */
const RAW_COLOUR = String.raw`^(#[0-9a-fA-F]{3,8}|(rgba?|hsla?)\(.*\))$`;

/** Style properties whose value must come from the spacing / radius / typography scale. */
const SCALED_STYLE_PROPS = [
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'gap',
  'rowGap',
  'columnGap',
  'borderRadius',
  'borderWidth',
  'fontSize',
  'lineHeight',
].join('|');

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/android/**',
      '**/ios/**',
      '**/*.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // §15: no `any`, and no `as` that hides a real typing problem.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      // §15: no empty catch, and no catch that swallows the problem+json `code`.
      'no-empty': ['error', { allowEmptyCatch: false }],
      '@typescript-eslint/only-throw-error': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },

  // ---------------------------------------------------------------------------
  // packages/core is the hexagon. It knows no platform: no React, no Expo, no
  // DOM, no network, no npm dependency at all. Two independent guards enforce
  // it — this rule, and the `lib`/`types` narrowing in packages/core/tsconfig.json.
  // Anything that is not a relative path is, by definition, the outside world.
  // ---------------------------------------------------------------------------
  {
    files: ['packages/core/src/**/*.ts'],
    ignores: ['packages/core/src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^[^.]',
              message:
                "packages/core est l'hexagone : il ne peut importer que ses propres fichiers (chemins relatifs). Un besoin de plateforme se déclare en port, il ne s'importe pas.",
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'core ne fait pas de réseau : passe par un port.' },
        { name: 'localStorage', message: 'core ne stocke rien : passe par SecureStore.' },
        { name: 'Date', message: "core ne lit pas l'horloge système : passe par le port Clock." },
        { name: 'window', message: 'core ignore la plateforme.' },
        { name: 'document', message: 'core ignore la plateforme.' },
        { name: 'navigator', message: 'core ignore la plateforme.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: "core ne lit pas l'horloge système : passe par le port Clock.",
        },
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: "core ne lit pas l'horloge système : passe par le port Clock.",
        },
        {
          selector: "CallExpression[callee.name='setTimeout']",
          message: 'core ne programme rien : le temps passe par un port.',
        },
      ],
    },
  },

  // core's own tests may reach for the test runner and for node, but still not
  // for a platform: a test that needs React proves the boundary moved.
  {
    files: ['packages/core/src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'expo', 'expo-*', 'react-native', 'react-native-*'],
              message: "Un test de core qui a besoin d'une plateforme dit que core en a besoin.",
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // §3 / §15: no literal colour or spacing value outside the token module.
  // Without this, half the screens drift within three sprints.
  // ---------------------------------------------------------------------------
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/{ui,features,adapters}/src/**/*.{ts,tsx}'],
    // The token module is the one place a colour is spelled out — and a test
    // that asserts a ratio has to name the two colours it is comparing.
    ignores: ['packages/ui/src/tokens/**', '**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${RAW_COLOUR}/]`,
          message:
            'Aucune couleur littérale hors de packages/ui/src/tokens : passe par le thème (brand-500 pour un remplissage, brand-600 pour du texte sur fond clair).',
        },
        {
          selector: `Property[key.name=/^(${SCALED_STYLE_PROPS})$/] > Literal[raw=/^[0-9]/]`,
          message:
            "Aucune valeur d'espacement, de rayon ou de typographie littérale : passe par les tokens de packages/ui.",
        },
        {
          selector: "JSXAttribute[name.name='allowFontScaling'][value.expression.value=false]",
          message:
            '§5 : le texte dynamique doit survivre à 200 %. allowFontScaling={false} est interdit.',
        },
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            "§15 : aucun fetch depuis un composant. Le réseau vit dans packages/api, et TanStack Query l'appelle.",
        },
      ],
    },
  },

  // React shells and the design system.
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/{ui,features}/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Config files run in node and are not part of the typed project graph.
  {
    files: ['**/*.config.{js,mjs,cjs,ts}', '**/*.setup.{js,mjs,cjs,ts}'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },
);
