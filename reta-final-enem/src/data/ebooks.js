// E-BOOKS DA LOJA. `capa` define as cores e o ícone da capa gerada em CSS.
export const EBOOKS = [
  {
    id: 'ebook-redacao',
    titulo: 'Redação Nota 1000 em 7 Passos',
    subtitulo: 'Do zero à proposta de intervenção perfeita',
    preco: 9.9,
    descricao: 'O passo a passo direto ao ponto para montar uma redação nota alta, mesmo se você trava na hora de começar.',
    topicos: [
      'Os 7 passos da redação nota 1000',
      '30 repertórios coringa que servem em vários temas',
      'Modelos de introdução e conclusão prontos',
      'Os 15 erros que mais derrubam a nota',
    ],
    capa: { de: '#0B1E3F', para: '#1E3A8A', destaque: '#FFC93C', icone: 'pen' },
  },
  {
    id: 'ebook-matematica',
    titulo: 'Matemática do ENEM: Fórmulas e Macetes',
    subtitulo: 'Tudo o que você precisa em uma folha só',
    preco: 7.9,
    descricao: 'As fórmulas que mais caem, explicadas com exemplos rápidos e truques para ganhar tempo na prova.',
    topicos: ['Porcentagem e juros em 5 minutos', 'Geometria: todas as áreas e volumes', 'Estatística e probabilidade sem susto', 'Macetes de cálculo mental para a prova'],
    capa: { de: '#1D4ED8', para: '#0EA5E9', destaque: '#FFFFFF', icone: 'calc' },
  },
  {
    id: 'ebook-humanas',
    titulo: 'Resumão de Humanas para a Reta Final',
    subtitulo: 'História, Geografia, Filosofia e Sociologia',
    preco: 7.9,
    descricao: 'Os temas que mais caem em Humanas organizados em linhas do tempo, mapas mentais e quadros comparativos.',
    topicos: [
      'Linha do tempo do Brasil (Colônia ao século XXI)',
      'Geografia ambiental e geopolítica atual',
      'Filósofos e sociólogos: quem disse o quê',
      'Mapas mentais para revisar em 15 minutos',
    ],
    capa: { de: '#C2410C', para: '#F59E0B', destaque: '#0B1E3F', icone: 'globe' },
  },
]

export const COMBO_EBOOKS = {
  id: 'combo-ebooks',
  titulo: 'Combo dos 3 E-books',
  preco: 17.9,
  precoDe: 25.7,
}
