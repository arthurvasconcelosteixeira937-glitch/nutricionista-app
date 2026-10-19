// DIA DA PROVA – checklist e dicas. Horários oficiais (horário de Brasília).
export const DIAS_PROVA = [
  { dia: '1º dia', data: 'Domingo, 8/11/2026', provas: 'Linguagens, Ciências Humanas e Redação', duracao: '5h30', termino: '19h' },
  { dia: '2º dia', data: 'Domingo, 15/11/2026', provas: 'Ciências da Natureza e Matemática', duracao: '5h', termino: '18h30' },
]

export const HORARIOS = [
  { hora: '12h', evento: 'Abertura dos portões' },
  { hora: '13h', evento: 'Fechamento dos portões (não tem choro!)' },
  { hora: '13h30', evento: 'Início da prova' },
  { hora: '19h / 18h30', evento: 'Término (1º dia / 2º dia)' },
]

export const CHECKLIST_PROVA = [
  { id: 'doc', texto: 'Documento oficial com foto ORIGINAL (RG, CNH, passaporte...)', obrigatorio: true },
  { id: 'caneta', texto: 'Caneta esferográfica PRETA de tubo transparente (leve 2 ou 3)', obrigatorio: true },
  { id: 'cartao', texto: 'Cartão de Confirmação da Inscrição impresso (recomendado)', obrigatorio: false },
  { id: 'lanche', texto: 'Lanche leve (frutas, barrinha, sanduíche) de preferência em embalagem transparente', obrigatorio: false },
  { id: 'agua', texto: 'Garrafa de água transparente, sem rótulo', obrigatorio: false },
  { id: 'local', texto: 'Conferir o local de prova e o trajeto um dia antes', obrigatorio: false },
  { id: 'roupa', texto: 'Roupa confortável e um casaco (a sala pode ser fria)', obrigatorio: false },
  { id: 'remedio', texto: 'Remédios de uso pessoal, se precisar', obrigatorio: false },
]

export const DICAS_PROVA = [
  { titulo: 'Chegue cedo', texto: 'Planeje chegar por volta das 12h. Trânsito, chuva e fila acontecem — às 13h o portão fecha e não abre mais.' },
  { titulo: 'Horário de Brasília', texto: 'Tudo segue o horário de Brasília. Se você mora em outro fuso (AM, MT, MS, RO, RR, AC), ajuste o despertador!' },
  { titulo: 'Divida o tempo (1º dia)', texto: '5h30 para 90 questões + redação: cerca de 1h para a redação, 30 min para passar a limpo e ~2,5 min por questão.' },
  { titulo: 'Divida o tempo (2º dia)', texto: '5h para 90 questões: cerca de 3 min por questão. Comece pela área que você domina mais.' },
  { titulo: 'Não trave', texto: 'Não sabe? Marque um palpite consciente, sinalize e volte depois. Nunca deixe questão em branco: não há desconto por erro.' },
  { titulo: 'Gabarito com calma', texto: 'Reserve os últimos 30 minutos para passar as respostas para o cartão-resposta. Não deixe para o fim!' },
  { titulo: 'Celular desligado', texto: 'Celular e eletrônicos vão desligados no envelope porta-objetos. Se tocar, você é eliminado.' },
  { titulo: 'Noite anterior', texto: 'Nada de virar a noite estudando. Durma bem, coma algo leve e confie no que você revisou.' },
]
