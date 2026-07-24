import { defineConfig } from 'wxt';

const firefoxGeckoSettings: {
  id: string;
  strict_min_version: string;
} & Record<string, unknown> = {
  id: '{7396a824-2f77-4f7e-a84c-f0b0ae80cfdc}',
  strict_min_version: '142.0',
  data_collection_permissions: {
    required: ['none'],
  },
};

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      if (!Array.isArray(manifest.web_accessible_resources)) {
        return;
      }

      for (const resource of manifest.web_accessible_resources) {
        if (resource && typeof resource === 'object' && 'use_dynamic_url' in resource) {
          delete (resource as { use_dynamic_url?: boolean }).use_dynamic_url;
        }
      }
    },
  },
  vite: () => ({
    resolve: {
      alias: [
        {
          find: 'react-dom/client',
          replacement: 'preact/compat/client',
        },
        {
          find: 'react-dom',
          replacement: 'preact/compat',
        },
        {
          find: 'react/jsx-dev-runtime',
          replacement: 'preact/jsx-dev-runtime',
        },
        {
          find: 'react/jsx-runtime',
          replacement: 'preact/jsx-runtime',
        },
        {
          find: 'react',
          replacement: 'preact/compat',
        },
      ],
    },
  }),
  manifest: {
    name: 'Better Trading for Firefox',
    homepage_url: 'https://github.com/appaKappaK/better-trading-for-firefox',
    description: 'Bookmark trade searches, track history, and apply live enhancers on the Path of Exile trade site. Firefox-only MV3 extension.',
    permissions: ['storage'],
    web_accessible_resources: [
      {
        resources: ['assets/images/bookmark-folder/*.png'],
        matches: [
          '*://pathofexile.com/*',
          '*://www.pathofexile.com/*',
        ],
      },
    ],
    host_permissions: [
      '*://pathofexile.com/trade*',
      '*://www.pathofexile.com/trade*',
      '*://pathofexile.com/trade2*',
      '*://www.pathofexile.com/trade2*',
      'https://poe.ninja/*',
    ],
    action: {
      default_title: 'Better Trading for Firefox',
    },
    browser_specific_settings: {
      gecko: firefoxGeckoSettings,
    },
  },
});
