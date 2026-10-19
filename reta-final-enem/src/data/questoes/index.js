import linguagens from './linguagens.js'
import humanas from './humanas.js'
import natureza from './natureza.js'
import matematica from './matematica.js'

export const QUESTOES = { linguagens, humanas, natureza, matematica }
export const TODAS_QUESTOES = [...linguagens, ...humanas, ...natureza, ...matematica]
