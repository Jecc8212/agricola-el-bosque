import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const paquete = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/**
 * El commit desde el que se construyó, cuando se puede saber.
 *
 * En el computador de quien despliega hay repositorio y se obtiene; en el
 * servidor que compila no viaja la carpeta `.git`, así que ahí queda vacío.
 * Es un dato de apoyo, no el principal: el que siempre está es la hora.
 */
function commit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim()
  } catch {
    return ''
  }
}

/**
 * La hora **de compilación**, no la del navegador.
 *
 * Es toda la diferencia: una hora tomada al abrir la página siempre diría
 * «ahora» y no probaría nada. Ésta queda congelada dentro del archivo que se
 * publica, así que si cambia es porque efectivamente subió una versión nueva.
 */
const compiladoEn = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date())

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __VERSION__: JSON.stringify(paquete.version),
    __COMPILADO__: JSON.stringify(compiladoEn),
    __COMMIT__: JSON.stringify(commit()),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5180 },
})
