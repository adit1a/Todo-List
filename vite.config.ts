import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tentang: resolve(__dirname, 'tentang/index.html'),
        iphone: resolve(__dirname, 'tentang/iphone9.html'),
        dashboard: resolve(__dirname, 'dashboard/index.html'),
      },
    },
  },

})