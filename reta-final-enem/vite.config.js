import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'

// Na pré-visualização de arquivo único, o favicon vai embutido e os links do PWA saem (não há arquivos ao lado).
const htmlArquivoUnico = () => ({
  name: 'html-arquivo-unico',
  transformIndexHtml(html) {
    const favicon = `data:image/svg+xml;base64,${readFileSync('public/favicon.svg').toString('base64')}`
    return html.replace('href="./favicon.svg"', `href="${favicon}"`).replace(/\s*<link rel="(apple-touch-icon|manifest)"[^>]*>/g, '')
  },
})

// `npm run build` gera o site normal (pasta dist/) com PWA.
// `npm run build:preview` gera um único arquivo HTML (pasta dist-preview/) para pré-visualização.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'singlefile' ? [react(), htmlArquivoUnico(), viteSingleFile()] : [react()],
  build: {
    outDir: mode === 'singlefile' ? 'dist-preview' : 'dist',
    copyPublicDir: mode !== 'singlefile',
  },
}))
