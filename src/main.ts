import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from '~pages'
import App from './App.vue'
import '@unocss/reset/tailwind.css'
import 'uno.css'
import '~/styles/tokens.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

createApp(App).use(router).mount('#app')
