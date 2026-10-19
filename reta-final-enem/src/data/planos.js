// PLANOS E PREÇOS. Altere aqui os valores e textos.
// `id` é usado no checkout e para liberar o acesso.
export const PLANOS = [
  {
    id: 'gratis',
    nome: 'Grátis',
    preco: 0,
    precoDe: null,
    descricao: 'Para conhecer o app',
    selo: null,
    itens: ['5 questões por área', '1 resumo por área', '3 dias do plano de revisão', '10 flashcards', 'Checklist do Dia da Prova'],
    bloqueados: ['Simulado relâmpago', 'Todos os temas de redação'],
  },
  {
    id: 'completo',
    nome: 'Revisão Completa',
    preco: 19.9,
    precoDe: 49.9,
    descricao: 'Pagamento único, acesso até o ENEM',
    selo: 'MAIS VENDIDO',
    itens: [
      '80 questões com explicação',
      '20 resumos com macetes',
      'Plano completo de 21 dias',
      '40 flashcards',
      'Redação: 8 temas + repertórios',
      'Simulado relâmpago com cronômetro',
    ],
    bloqueados: [],
  },
  {
    id: 'combo',
    nome: 'Combo Aprovação',
    preco: 29.9,
    precoDe: 79.9,
    descricao: 'Tudo liberado + 3 e-books',
    selo: 'MELHOR CUSTO',
    itens: ['Tudo do Revisão Completa', 'E-book Redação Nota 1000 em 7 Passos', 'E-book Matemática do ENEM: Fórmulas e Macetes', 'E-book Resumão de Humanas para a Reta Final'],
    bloqueados: [],
  },
]

// Oferta extra mostrada na compra do plano Revisão Completa.
export const UPSELL_EBOOKS = { id: 'upsell-ebooks', nome: 'Combo de E-books (3 e-books)', preco: 12.9 }

// Limites do plano grátis.
export const LIMITES_GRATIS = {
  questoesPorArea: 5,
  resumosPorArea: 1,
  diasPlano: 3,
  flashcards: 10,
  temasRedacao: 2,
}
