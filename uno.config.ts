import { defineConfig, presetIcons, presetWind3 } from 'unocss'

export default defineConfig({
  presets: [presetWind3(), presetIcons()],
  theme: {
    colors: {
      // 全部指向 token，组件里禁止出现色值字面量
      canvas: 'var(--canvas-bg)',
      surface: 'var(--node-surface)',
      edgeProto: 'var(--edge-proto)',
      edgePrototype: 'var(--edge-prototype)',
      edgeCtor: 'var(--edge-constructor)',
      ink: 'var(--text-primary)',
      muted: 'var(--text-muted)',
    },
  },
})
