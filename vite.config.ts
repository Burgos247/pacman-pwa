import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 3000,
    open: false,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'assets/sprites/*.png',
        'assets/sfx/*.mp3',
        'assets/sfx/*.ogg',
        'assets/levels/*.json',
        'assets/font/*',
        'assets/images/*.png',
      ],
      manifest: {
        name: 'Pac-Toshi',
        short_name: 'Pac-Toshi',
        description: 'Bitcoin Pacman built with Phaser 3 + Vite + TypeScript',
        theme_color: '#fed049',
        background_color: '#000000',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'assets/images/launcher-icon-1x.png', sizes: '48x48', type: 'image/png' },
          { src: 'assets/images/launcher-icon-1-5x.png', sizes: '72x72', type: 'image/png' },
          { src: 'assets/images/launcher-icon-2x.png', sizes: '96x96', type: 'image/png' },
          { src: 'assets/images/launcher-icon-3x.png', sizes: '144x144', type: 'image/png' },
          {
            src: 'assets/images/launcher-icon-4x.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,mp3,ogg,json,xml,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
