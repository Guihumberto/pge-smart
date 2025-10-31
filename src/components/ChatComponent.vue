<template>
  <v-card class="pa-4 d-flex flex-column border mt-5" style="height: 100%;">
    <v-card-title class="d-flex align-center">
      Chat AI
      <v-spacer></v-spacer>
      <!-- <v-btn icon @click="$emit('closeChat')">
        <v-icon>mdi-close</v-icon>
      </v-btn> -->
    </v-card-title>
    <v-card-text class="d-flex flex-column" style="height: 34vh; overflow-y: auto;">
      <div class="chat-messages" ref="messagesContainer">
        <v-alert
          v-for="(message, index) in messages"
          :key="index"
          :type="message.sender === 'user' ? 'info' : 'success'"
          class="mb-2"
        >
          {{ message.text }}
        </v-alert>
      </div>
    </v-card-text>
    <v-card-actions>
      <div>
        <div class="examples mb-2 w-100">
          <small class="text-muted">Exemplos de prompts:</small>
          <v-chip
            v-for="(example, index) in examples"
            :key="index"
            size="small"
            @click="setMessage(example)"
            class="mr-1 mb-1"
          >
            {{ example }}
          </v-chip>
        </div>
        <v-textarea
          v-model="userMessage"
          placeholder="Digite sua mensagem..."
          variant="outlined"
          rows="2"
          dense
          @keydown.enter.exact.prevent="sendMessage"
          class="flex-grow-1 mr-2"
        ></v-textarea>
      </div>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const messages = ref([
  {
    sender: 'bot',
    text: 'Olá! Como posso ajudar com sua pesquisa?'
  }
])
const userMessage = ref('')
const messagesContainer = ref(null)
const examples = ref([
  'Resumir documento',
  'Extrair palavras-chave',
  'Fazer perguntas sobre o documento',
  'Comparar documentos'
])

const emit = defineEmits(['closeChat'])

const setMessage = (text) => {
  userMessage.value = text
}

const sendMessage = async () => {
  if (!userMessage.value.trim()) return

  const message = { sender: 'user', text: userMessage.value }
  messages.value.push(message)
  userMessage.value = ''
  await nextTick()
  scrollToBottom()

  // Simulate bot response
  setTimeout(() => {
    messages.value.push({
      sender: 'bot',
      text: 'Esta é uma resposta simulada. Em um aplicativo real, isso seria processado por uma IA.'
    })
    scrollToBottom()
  }, 1000)
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}
</script>

<style scoped>
.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
}
</style>
