import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    define: {
      __XB_DEFAULTS__: JSON.stringify({
        apiOrigin: env.VITE_XBOARD_URL || 'http://127.0.0.1:7001',
        adminPath: env.VITE_XBOARD_ADMIN_PATH || '',
      }),
    },
  }
})
