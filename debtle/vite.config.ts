import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({plugins:[react(),tailwindcss()], build:{rollupOptions:{output:{manualChunks(id){if(id.includes('/src/data/debt.json'))return 'debt-data';if(id.includes('node_modules'))return 'vendor';}}}}, test:{environment:'jsdom', setupFiles:['./tests/setup.ts'],include:['tests/**/*.test.{ts,tsx}'],restoreMocks:true}});
