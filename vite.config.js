import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: ["alagros.keenetic.pro"], // Güvenli host ayarı
    watch: {
      // Artık tek bir db.json yerine 'data' klasöründeki tüm değişiklikleri görmezden geliyoruz
      ignored: ['**/data/**']
    }
  }
})