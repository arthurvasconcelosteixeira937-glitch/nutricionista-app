// Gera os ícones PNG do PWA a partir dos SVGs (usa o Chromium do Playwright).
// Uso: npm run icons
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const favicon = readFileSync('public/favicon.svg', 'utf8')
const maskable = readFileSync('public/icons/icon-maskable.svg', 'utf8')
const alvos = [
  { svg: favicon, size: 192, out: 'public/icons/icon-192.png', bg: 'transparent' },
  { svg: favicon, size: 512, out: 'public/icons/icon-512.png', bg: 'transparent' },
  { svg: maskable, size: 512, out: 'public/icons/icon-maskable-512.png', bg: '#0B1E3F' },
  { svg: maskable, size: 180, out: 'public/icons/apple-touch-icon.png', bg: '#0B1E3F' },
]
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage()
for (const a of alvos) {
  await page.setViewportSize({ width: a.size, height: a.size })
  await page.setContent(`<html><body style="margin:0;background:${a.bg}">${a.svg.replace('<svg', `<svg width="${a.size}" height="${a.size}"`)}</body></html>`)
  await page.screenshot({ path: a.out, omitBackground: a.bg === 'transparent' })
  console.log('ok', a.out)
}
await browser.close()
