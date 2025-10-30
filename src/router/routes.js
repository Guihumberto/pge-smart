export default [
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '/',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/about',
        name: 'About',
        component: () => import('@/views/About.vue'),
      },
      {
        path: '/user-area',
        name: 'UserArea',
        component: () => import('@/views/UserArea.vue'),
      },
      {
        path: '/search-results',
        name: 'SearchResults',
        component: () => import('@/views/SearchResults.vue'),
      },
      {
        path: '/new-workspace',
        name: 'NewWorkspace',
        component: () => import('@/views/NewWorkspace.vue'),
      },
      {
        path: '/my-folders',
        name: 'MyFolders',
        component: () => import('@/views/MyFolders.vue'),
      }
    ]
  },
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/auth/Login.vue'),
        meta: { guest: true }
      },
      {
        path: '/register',
        name: 'Register',
        component: () => import('@/views/auth/Register.vue'),
        meta: { guest: true }
      }
    ]
  }
]
