export default [
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',          // ← era '/', agora string vazia = rota índice
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'about',     // ← sem barra inicial
        name: 'About',
        component: () => import('@/views/About.vue'),
      },
      {
        path: 'user-area',
        name: 'UserArea',
        component: () => import('@/views/UserArea.vue'),
      },
      {
        path: 'planos',
        name: 'Plans',
        component: () => import('@/views/PlansView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'workspace',
        name: 'Workspace',
        component: () => import('@/views/WorkspaceView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'metas',
        name: 'StudentGoals',
        component: () => import('@/views/StudentGoalsView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'metas/:enrollmentId/:goalProgressId',
        name: 'StudentGoalDetail',
        component: () => import('@/views/StudentGoalDetailView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'metas/:enrollmentId/:goalProgressId/lei-seca/:taskId',
        name: 'StudentLeiSeca',
        component: () => import('@/views/LeiSecaReaderView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'workspace/preview/:planId/:goalId',
        name: 'GoalPreview',
        component: () => import('@/views/GoalPreviewView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'workspace/preview/:planId/:goalId/lei-seca/:taskId',
        name: 'LeiSecaReader',
        component: () => import('@/views/LeiSecaReaderView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'explorar',
        name: 'PublicPlans',
        component: () => import('@/views/PublicPlansView.vue'),
        meta: { requiresAuth: true }
      },
      { path: 'mentor/plano/:id',
        name: 'PlanManage',     
        component: () => import('@/views/PlanManageView.vue'),     
        meta: { requiresAuth: true } 
      },
      { path: 'mentor/alunos',    
        name: 'MentorStudents', 
        component: () => import('@/views/MentorStudentsView.vue'), 
        meta: { requiresAuth: true } 
      },
      {
        path: '/convite/:token',
        name: 'Invite',
        component: () => import('@/views/InviteView.vue'),
        // sem meta.requiresAuth — página pública
      },
      {
        path: '/convite/callback',
        name: 'InviteCallback',
        component: () => import('@/views/InviteCallbackView.vue'),
      },
    ]
  },
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',     // ← sem barra inicial
        name: 'Login',
        component: () => import('@/views/auth/Login.vue'),
        meta: { guest: true }
      },
      {
        path: 'register',  // ← sem barra inicial
        name: 'Register',
        component: () => import('@/views/auth/Register.vue'),
        meta: { guest: true }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',  // ← 404 sempre bom ter
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
  },
  {
    path: '/callback',
    name: 'Callback',
    component: () => import('@/views/auth/CallbackView.vue'),
  },
  {
    path: '/logout-callback',
    name: 'LogoutCallback',
    component: () => import('@/views/auth/LogoutCallbackView.vue'),
  },
]