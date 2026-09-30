import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/calculator'
  },
  {
    path: '/calculator',
    name: 'Calculator',
    component: () => import('@/views/calculator/index.vue')
  },
  {
    path: '/paldex',
    name: 'Paldex',
    component: () => import('@/views/paldex/index.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router