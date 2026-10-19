// As 4 áreas do ENEM. `cor` e `corClara` são usadas em cards, gráficos e capas.
export const AREAS = [
  { id: 'linguagens', nome: 'Linguagens', nomeCompleto: 'Linguagens, Códigos e suas Tecnologias', emoji: '📚', cor: '#7C3AED', corClara: '#EDE9FE', dia: 1 },
  { id: 'humanas', nome: 'Humanas', nomeCompleto: 'Ciências Humanas e suas Tecnologias', emoji: '🌎', cor: '#EA580C', corClara: '#FFEDD5', dia: 1 },
  { id: 'natureza', nome: 'Natureza', nomeCompleto: 'Ciências da Natureza e suas Tecnologias', emoji: '🧪', cor: '#059669', corClara: '#D1FAE5', dia: 2 },
  { id: 'matematica', nome: 'Matemática', nomeCompleto: 'Matemática e suas Tecnologias', emoji: '📐', cor: '#2563EB', corClara: '#DBEAFE', dia: 2 },
]

export const areaPorId = (id) => AREAS.find((a) => a.id === id)
