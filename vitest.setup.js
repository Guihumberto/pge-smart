// Polyfill para Node 18: crypto.hash() (sync) só existe em Node 21+,
// e é usado pelo @vitejs/plugin-vue 6. Sem isso, transformar .vue quebra.
import crypto from 'node:crypto'

if (typeof crypto.hash !== 'function') {
  crypto.hash = (algorithm, data, encoding = 'hex') => {
    return crypto.createHash(algorithm).update(data).digest(encoding)
  }
}
