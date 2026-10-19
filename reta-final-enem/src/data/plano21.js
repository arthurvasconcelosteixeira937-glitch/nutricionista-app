// PLANO DE REVISÃO EM 21 DIAS. Os 3 primeiros dias são liberados no plano GRÁTIS.
// Tipos de tarefa e para onde levam:
//   quiz (area) → Quizzes da área | resumo (id) → Resumo | flashcards → Flashcards
//   redacao → Redação | simulado → Simulado | prova → Dia da Prova
export const PLANO_21 = [
  {
    dia: 1,
    titulo: 'Largada em Linguagens',
    tarefas: [
      { tipo: 'resumo', id: 'lin-interpretacao', texto: 'Ler o resumo: Interpretação de texto' },
      { tipo: 'quiz', area: 'linguagens', texto: 'Fazer 1 quiz de Linguagens' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 2,
    titulo: 'Matemática sem medo',
    tarefas: [
      { tipo: 'resumo', id: 'mat-porcentagem', texto: 'Ler o resumo: Porcentagem e juros' },
      { tipo: 'quiz', area: 'matematica', texto: 'Fazer 1 quiz de Matemática' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 3,
    titulo: 'Viagem pela História',
    tarefas: [
      { tipo: 'resumo', id: 'hum-republica', texto: 'Ler o resumo: Brasil República' },
      { tipo: 'quiz', area: 'humanas', texto: 'Fazer 1 quiz de Humanas' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 4,
    titulo: 'Natureza em foco',
    tarefas: [
      { tipo: 'resumo', id: 'nat-ecologia', texto: 'Ler o resumo: Ecologia' },
      { tipo: 'quiz', area: 'natureza', texto: 'Fazer 1 quiz de Natureza' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 5,
    titulo: 'Redação: entenda o jogo',
    tarefas: [
      { tipo: 'redacao', texto: 'Estudar as 5 competências da redação' },
      { tipo: 'redacao', texto: 'Ler a estrutura pronta (intro, 2 D, conclusão)' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 6,
    titulo: 'Figuras de linguagem',
    tarefas: [
      { tipo: 'resumo', id: 'lin-figuras', texto: 'Ler o resumo: Figuras de linguagem' },
      { tipo: 'quiz', area: 'linguagens', texto: 'Fazer 1 quiz de Linguagens' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 7,
    titulo: 'Estatística na veia',
    tarefas: [
      { tipo: 'resumo', id: 'mat-estatistica', texto: 'Ler o resumo: Estatística e probabilidade' },
      { tipo: 'quiz', area: 'matematica', texto: 'Fazer 1 quiz de Matemática' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 8,
    titulo: 'Planeta em pauta',
    tarefas: [
      { tipo: 'resumo', id: 'hum-ambiental', texto: 'Ler o resumo: Geografia ambiental' },
      { tipo: 'quiz', area: 'humanas', texto: 'Fazer 1 quiz de Humanas' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 9,
    titulo: 'Química orgânica',
    tarefas: [
      { tipo: 'resumo', id: 'nat-organica', texto: 'Ler o resumo: Química orgânica básica' },
      { tipo: 'quiz', area: 'natureza', texto: 'Fazer 1 quiz de Natureza' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 10,
    titulo: 'Redação: mão na massa',
    tarefas: [
      { tipo: 'redacao', texto: 'Escolher um tema e escrever a introdução' },
      { tipo: 'redacao', texto: 'Montar uma proposta de intervenção com os 5 elementos' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 11,
    titulo: 'Simulado relâmpago #1',
    tarefas: [
      { tipo: 'simulado', texto: 'Fazer o Simulado Relâmpago (20 questões)' },
      { tipo: 'simulado', texto: 'Ler a explicação das questões que errou' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 12,
    titulo: 'Funções da linguagem',
    tarefas: [
      { tipo: 'resumo', id: 'lin-funcoes', texto: 'Ler o resumo: Funções da linguagem' },
      { tipo: 'quiz', area: 'linguagens', texto: 'Fazer 1 quiz de Linguagens' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 13,
    titulo: 'Geometria',
    tarefas: [
      { tipo: 'resumo', id: 'mat-geometria', texto: 'Ler o resumo: Geometria plana e espacial' },
      { tipo: 'quiz', area: 'matematica', texto: 'Fazer 1 quiz de Matemática' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 14,
    titulo: 'Sociologia',
    tarefas: [
      { tipo: 'resumo', id: 'hum-sociologia', texto: 'Ler o resumo: Sociologia — os clássicos' },
      { tipo: 'quiz', area: 'humanas', texto: 'Fazer 1 quiz de Humanas' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 15,
    titulo: 'Genética e corpo humano',
    tarefas: [
      { tipo: 'resumo', id: 'nat-genetica', texto: 'Ler o resumo: Genética, células e corpo' },
      { tipo: 'quiz', area: 'natureza', texto: 'Fazer 1 quiz de Natureza' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 16,
    titulo: 'Redação completa',
    tarefas: [
      { tipo: 'redacao', texto: 'Escrever uma redação completa (cronometre 1h)' },
      { tipo: 'redacao', texto: 'Conferir a redação com o checklist' },
      { tipo: 'flashcards', texto: 'Revisar 5 flashcards' },
    ],
  },
  {
    dia: 17,
    titulo: 'Linguagens: revisão final',
    tarefas: [
      { tipo: 'resumo', id: 'lin-variacao', texto: 'Ler o resumo: Variação linguística' },
      { tipo: 'resumo', id: 'lin-literatura', texto: 'Ler o resumo: Escolas literárias e arte' },
      { tipo: 'quiz', area: 'linguagens', texto: 'Fazer 1 quiz de Linguagens' },
    ],
  },
  {
    dia: 18,
    titulo: 'Matemática: revisão final',
    tarefas: [
      { tipo: 'resumo', id: 'mat-razao', texto: 'Ler o resumo: Razão e proporção' },
      { tipo: 'resumo', id: 'mat-funcoes', texto: 'Ler o resumo: Funções e progressões' },
      { tipo: 'quiz', area: 'matematica', texto: 'Fazer 1 quiz de Matemática' },
    ],
  },
  {
    dia: 19,
    titulo: 'Humanas: revisão final',
    tarefas: [
      { tipo: 'resumo', id: 'hum-filosofia', texto: 'Ler o resumo: Filosofia essencial' },
      { tipo: 'resumo', id: 'hum-globalizacao', texto: 'Ler o resumo: Industrialização e globalização' },
      { tipo: 'quiz', area: 'humanas', texto: 'Fazer 1 quiz de Humanas' },
    ],
  },
  {
    dia: 20,
    titulo: 'Natureza: revisão final',
    tarefas: [
      { tipo: 'resumo', id: 'nat-quimica-geral', texto: 'Ler o resumo: Química geral do dia a dia' },
      { tipo: 'resumo', id: 'nat-eletricidade', texto: 'Ler o resumo: Física essencial' },
      { tipo: 'quiz', area: 'natureza', texto: 'Fazer 1 quiz de Natureza' },
    ],
  },
  {
    dia: 21,
    titulo: 'Reta final: tá pronto!',
    tarefas: [
      { tipo: 'simulado', texto: 'Fazer o Simulado Relâmpago final' },
      { tipo: 'prova', texto: 'Separar tudo do checklist do Dia da Prova' },
      { tipo: 'flashcards', texto: 'Revisar os flashcards que você errou' },
    ],
  },
]
