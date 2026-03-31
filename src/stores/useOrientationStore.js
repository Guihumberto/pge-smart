import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from 'nanoid'

export const useOrientationStore = defineStore('orientations', () => {
  const orientations = ref([
    {
      id: nanoid(),
      title: 'Leitura ativa',
      body: 'Leia o conteúdo grifando os pontos principais. Ao final, escreva um resumo de 3 linhas.'
    },
    {
      id: nanoid(),
      title: 'Revisão espaçada',
      body: 'Revise o conteúdo sem consultar o material. Anote o que não lembrar para reforço.'
    },
    {
      id: nanoid(),
      title: 'Resolução cronometrada',
      body: 'Resolva as questões em no máximo 1,5 min cada. Não revise durante — só ao final.'
    },
    {
      id: nanoid(),
      title: 'Lei seca artigo por artigo',
      body: 'Leia cada artigo em voz alta. Parafraseie o conteúdo antes de avançar.'
    },
  ])

  function add(title, body) {
    orientations.value.push({ id: nanoid(), title, body })
  }

  function remove(id) {
    orientations.value = orientations.value.filter(o => o.id !== id)
  }

  function update(id, patch) {
    const o = orientations.value.find(o => o.id === id)
    if (o) Object.assign(o, patch)
  }

  return { orientations, add, remove, update }
}, 
{
  persist: {
    key: 'orientations',
    paths: ['orientations'],
  }
})