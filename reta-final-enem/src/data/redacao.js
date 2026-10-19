// REDAÇÃO – competências, estrutura, temas para treinar e checklist.
// Os 2 primeiros temas são liberados no plano GRÁTIS.

export const COMPETENCIAS = [
  {
    n: 1,
    titulo: 'Norma-padrão',
    resumo: 'Escrever de acordo com a gramática: ortografia, acentuação, concordância, regência, pontuação.',
    dica: 'Releia procurando um erro por vez: primeiro acentos, depois vírgulas, depois concordância.',
  },
  {
    n: 2,
    titulo: 'Tema + tipo de texto + repertório',
    resumo: 'Entender a proposta, não fugir do tema, escrever um texto dissertativo-argumentativo e usar repertório sociocultural (fora dos textos motivadores).',
    dica: 'Use repertório LEGITIMADO (autor, lei, dado, fato histórico) e PRODUTIVO (ligado ao seu argumento).',
  },
  {
    n: 3,
    titulo: 'Projeto de texto',
    resumo: 'Selecionar, organizar e interpretar argumentos em defesa de um ponto de vista. O texto precisa ter um “plano” claro.',
    dica: 'Anuncie na introdução os 2 argumentos que você vai desenvolver — e desenvolva exatamente esses.',
  },
  {
    n: 4,
    titulo: 'Coesão',
    resumo: 'Ligar bem frases e parágrafos usando conectivos variados e retomadas (pronomes, sinônimos).',
    dica: 'Comece cada parágrafo com um conectivo: “Em primeiro lugar”, “Além disso”, “Portanto”.',
  },
  {
    n: 5,
    titulo: 'Proposta de intervenção',
    resumo: 'Propor uma solução detalhada para o problema, respeitando os direitos humanos.',
    dica: 'Use os 5 elementos: AGENTE, AÇÃO, MEIO, FINALIDADE e DETALHAMENTO.',
  },
]

export const ESTRUTURA = [
  {
    parte: 'Introdução',
    linhas: '5 a 7 linhas',
    passos: ['Repertório de abertura (fato, autor, lei, dado).', 'Apresente o problema ligado ao tema.', 'Tese: sua opinião + os 2 argumentos que você vai desenvolver.'],
    modelo:
      'De acordo com a Constituição Federal de 1988, [direito ligado ao tema] é garantido a todos. Na prática, porém, [problema do tema] ainda é uma realidade no Brasil. Esse cenário se deve, principalmente, a [argumento 1] e a [argumento 2].',
  },
  {
    parte: 'Desenvolvimento 1',
    linhas: '7 a 9 linhas',
    passos: ['Tópico frasal: apresente o argumento 1.', 'Explique a causa/consequência.', 'Repertório que comprove.', 'Feche ligando ao tema.'],
    modelo:
      'Em primeiro lugar, é importante destacar [argumento 1]. Isso acontece porque [explicação]. Segundo [autor/dado/fato], [repertório]. Dessa forma, [conclusão parcial ligada ao tema].',
  },
  {
    parte: 'Desenvolvimento 2',
    linhas: '7 a 9 linhas',
    passos: ['Tópico frasal: apresente o argumento 2.', 'Explique e aprofunde.', 'Repertório diferente do anterior.', 'Feche ligando ao tema.'],
    modelo: 'Além disso, [argumento 2] também agrava o problema. [Explicação]. Como afirma [autor], [repertório]. Assim, [conclusão parcial].',
  },
  {
    parte: 'Conclusão',
    linhas: '5 a 7 linhas',
    passos: ['Retome a tese.', 'Proposta de intervenção completa: AGENTE + AÇÃO + MEIO + FINALIDADE + DETALHAMENTO.'],
    modelo:
      'Portanto, é necessário combater [problema]. Para isso, o [AGENTE: Ministério da Educação] deve [AÇÃO: criar campanhas de conscientização] por meio de [MEIO: palestras nas escolas e anúncios nas redes sociais], com o objetivo de [FINALIDADE: reduzir o problema]. Essas palestras devem ser [DETALHAMENTO: conduzidas por especialistas e realizadas a cada bimestre].',
  },
]

export const PROPOSTA_INTERVENCAO = [
  { item: 'Agente', pergunta: 'Quem vai fazer?', exemplo: 'Ministério da Educação, Governo Federal, mídia, ONGs, escolas, família.' },
  { item: 'Ação', pergunta: 'O que vai ser feito?', exemplo: 'Criar campanhas, ampliar programas, fiscalizar, investir.' },
  { item: 'Meio/Modo', pergunta: 'Como vai ser feito?', exemplo: '“Por meio de” palestras, parcerias, verbas, redes sociais.' },
  { item: 'Finalidade', pergunta: 'Para quê?', exemplo: '“A fim de” / “com o objetivo de” reduzir, garantir, combater...' },
  { item: 'Detalhamento', pergunta: 'Algum detalhe a mais?', exemplo: 'Explique melhor um dos itens: quem conduz, com que frequência, para quem.' },
]

export const TEMAS = [
  {
    titulo: 'Desafios para combater a desinformação nas redes sociais no Brasil',
    contexto: 'Fake news, algoritmos que criam bolhas e a dificuldade de checar informações.',
    repertorios: [
      'Zygmunt Bauman – modernidade líquida e relações superficiais.',
      'Conceito de “pós-verdade” (Oxford, 2016): emoções valem mais que fatos.',
      'Marco Civil da Internet (Lei 12.965/2014).',
      'Filme “O Dilema das Redes” (2020).',
    ],
  },
  {
    titulo: 'Caminhos para valorizar a saúde mental dos jovens brasileiros',
    contexto: 'Ansiedade, pressão estética e acadêmica, uso excessivo de telas.',
    repertorios: [
      'OMS: saúde é bem-estar físico, mental e social, não só ausência de doença.',
      'Byung-Chul Han – “Sociedade do Cansaço”.',
      'Campanha Setembro Amarelo.',
      'Constituição de 1988, art. 196: saúde é direito de todos e dever do Estado.',
    ],
  },
  {
    titulo: 'Desafios para enfrentar a insegurança alimentar no Brasil',
    contexto: 'Fome, desperdício de alimentos e desigualdade de renda.',
    repertorios: [
      'Josué de Castro – “Geografia da Fome” (1946).',
      'Constituição, art. 6º: alimentação é direito social (desde 2010).',
      'Contradição: o Brasil é grande produtor de alimentos e ainda tem fome.',
      'Agenda 2030 da ONU – ODS 2: Fome Zero.',
    ],
  },
  {
    titulo: 'Os impactos das mudanças climáticas na vida da população brasileira',
    contexto: 'Enchentes, secas extremas, ondas de calor e quem mais sofre com elas.',
    repertorios: ['Acordo de Paris (2015).', 'Conceito de racismo ambiental.', 'Enchentes no Rio Grande do Sul (2024).', 'COP30 em Belém (2025).'],
  },
  {
    titulo: 'Desafios para a inclusão de pessoas com deficiência no mercado de trabalho',
    contexto: 'Acessibilidade, preconceito (capacitismo) e cumprimento da lei.',
    repertorios: [
      'Lei de Cotas (Lei 8.213/1991) para empresas com 100+ funcionários.',
      'Lei Brasileira de Inclusão (Lei 13.146/2015).',
      'Conceito de capacitismo.',
      'Constituição: princípio da dignidade da pessoa humana.',
    ],
  },
  {
    titulo: 'A persistência da violência contra a mulher no Brasil',
    contexto: 'Machismo estrutural, subnotificação e medidas de proteção.',
    repertorios: [
      'Lei Maria da Penha (Lei 11.340/2006).',
      'Lei do Feminicídio (Lei 13.104/2015).',
      'Simone de Beauvoir – “Não se nasce mulher, torna-se mulher”.',
      'Disque 180 – Central de Atendimento à Mulher.',
    ],
  },
  {
    titulo: 'Desafios para democratizar o acesso à leitura no Brasil',
    contexto: 'Poucas bibliotecas, preço dos livros e falta de hábito de leitura.',
    repertorios: [
      'Antonio Candido – “O direito à literatura”: literatura é direito humano.',
      'Pesquisa “Retratos da Leitura no Brasil” (Instituto Pró-Livro).',
      'Paulo Freire – “A leitura do mundo precede a leitura da palavra”.',
      'Monteiro Lobato – “Um país se faz com homens e livros”.',
    ],
  },
  {
    titulo: 'O combate ao trabalho análogo à escravidão no Brasil contemporâneo',
    contexto: 'Fiscalização, vulnerabilidade social e cadeias produtivas.',
    repertorios: [
      'Lei Áurea (1888) e abolição sem inclusão.',
      'Código Penal, art. 149: crime de redução à condição análoga à de escravo.',
      '“Lista Suja” do trabalho escravo.',
      'Declaração Universal dos Direitos Humanos (1948), art. 4º.',
    ],
  },
]

export const CHECKLIST_REDACAO = [
  'Escrevi entre 25 e 30 linhas (mínimo 8 linhas para não zerar)?',
  'A introdução apresenta o tema e deixa clara a minha TESE?',
  'Anunciei 2 argumentos na introdução e desenvolvi exatamente esses 2?',
  'Usei pelo menos 2 repertórios legitimados e ligados ao argumento?',
  'Cada parágrafo começa com um conectivo diferente?',
  'Não fugi do tema e mencionei as palavras-chave do tema ao longo do texto?',
  'A conclusão tem AGENTE, AÇÃO, MEIO, FINALIDADE e DETALHAMENTO?',
  'A proposta respeita os direitos humanos?',
  'Revisei acentuação, vírgulas e concordância?',
  'Evitei gírias, abreviações e frases muito longas?',
  'Não copiei trechos dos textos motivadores?',
]
