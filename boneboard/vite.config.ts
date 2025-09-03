import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import type { PluginOption } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    // Simplified static copy for production builds
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@emurgo/cardano-serialization-lib-browser/*.wasm',
          dest: 'assets'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Polyfill for Node.js built-ins
      'node:util': 'util',
      'node:buffer': 'buffer',
      'node:stream': 'stream-browserify',
      'node:crypto': 'crypto-browserify',
      util: 'util',
      buffer: 'buffer',
      process: 'process',
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      // Add path to cardano-serialization-lib-browser
      '@emurgo/cardano-serialization-lib-browser': path.resolve(
        __dirname,
        'node_modules/@emurgo/cardano-serialization-lib-browser'
      ),
    },
  },
  server: {
    port: 5173,
    open: true,
    fs: {
      allow: ['..']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
      // Enable esbuild polyfill plugins
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }),
        NodeModulesPolyfillPlugin()
      ],
    },
    include: [
      '@lucid-evolution/core',
      '@emurgo/cardano-serialization-lib-browser',
      '@dcspark/cardano-multiplatform-lib-browser',
    ],
    exclude: ['@emurgo/cardano-serialization-lib-asmjs'],
  },
  define: {
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    global: 'globalThis',
    process: 'process',
    // Suppress specific console warnings
    __SUPPRESS_ETERNL_WARNINGS__: true,
  },
  build: {
    target: 'es2020',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Needed for WASM
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: ['node-fetch'],
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }) as any,
        NodeModulesPolyfillPlugin() as any
      ],
      output: {
        manualChunks: {
          'cardano-libs': [
            '@emurgo/cardano-serialization-lib-browser',
            '@dcspark/cardano-multiplatform-lib-browser'
          ]
        },
        // This ensures the wasm file is properly loaded
        chunkFileNames: 'assets/[name].[hash].js'
      }
    }
  },
  worker: {
    format: 'es',
    plugins: (): PluginOption[] => [
      wasm(),
      topLevelAwait()
    ]
  }
})
