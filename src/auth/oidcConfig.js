import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

export const oidcClient = new UserManager({
  authority:                'https://auth.studialex.com.br',
  client_id:                'legis-app',
  redirect_uri:             window.location.origin + '/callback',
  post_logout_redirect_uri: window.location.origin + '/logout-callback',
  response_type:            'code',
  scope:                    'openid',
  loadUserInfo:             false,
  automaticSilentRenew:     false,

  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  userStore:  new WebStorageStateStore({ store: window.localStorage  }),

  metadata: {
    issuer:                 'https://auth.studialex.com.br',
    authorization_endpoint: 'https://auth.studialex.com.br/oauth2/authorize',
    token_endpoint:         'https://auth.studialex.com.br/oauth2/token',
    userinfo_endpoint:      'https://auth.studialex.com.br/userinfo',
    jwks_uri:               'https://auth.studialex.com.br/oauth2/jwks',
    revocation_endpoint:    'https://auth.studialex.com.br/oauth2/revoke',
    introspection_endpoint: 'https://auth.studialex.com.br/oauth2/introspect',
    // ← end_session_endpoint REMOVIDO
  },
})