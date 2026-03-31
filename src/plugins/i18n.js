import { createI18n } from 'vue-i18n'

const messages = {
  'pt-BR': {
    goals: {
      title: 'Minhas Metas',
      add: 'Adicionar Meta',
      empty: 'Nenhuma meta cadastrada ainda.',
    },
    common: {
      save: 'Salvar',
      cancel: 'Cancelar',
      delete: 'Excluir',
      edit: 'Editar',
      loading: 'Carregando...',
    }
  }
}

export default createI18n({
  legacy: false, // usa Composition API
  locale: 'pt-BR',
  fallbackLocale: 'pt-BR',
  messages,
})