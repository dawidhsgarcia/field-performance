import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...preset,
    transparent: {
      ...preset.transparent,
      resizeOptions: { fit: 'contain', background: 'transparent' },
    },
    maskable: {
      sizes: [512],
      padding: 0.4,
      resizeOptions: { fit: 'contain', background: '#464c65' },
    },
    apple: {
      sizes: [180],
      resizeOptions: { fit: 'contain', background: '#464c65' },
    },
  },
  images: ['public/pwa/logo.svg'],
})