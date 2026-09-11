import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  unocss: true,
  ignores: ['docs/**', '.superpowers/**', 'dist/**'],
}, {
  // core 层必须保持纯净：不得引入 Vue 或浏览器相关依赖
  files: ['src/core/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: ['vue', 'vue-router', '@vueuse/*', '@vue-flow/*'],
    }],
  },
})
