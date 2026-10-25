/* ===== CONFIGURAÇÃO DO TÔ EM DIA =====
   É o único arquivo que você precisa editar. Veja o PLANO.md, passo 1. */
window.CONFIG = {
  // WhatsApp da empresa: só números, com 55 e DDD. Ex: "5591981490959"
  WHATSAPP: "5591981490959",

  // Supabase → Project Settings → API → "Project URL" e "anon public key"
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  // ID do Pixel da Meta (Gerenciador de Eventos). Deixe vazio para não usar.
  PIXEL_ID: "",

  // Mensagem que abre no WhatsApp quando você toca em "Chamar" no painel.
  // {nome} vira o primeiro nome da pessoa.
  MENSAGEM_ADM:
    "Oi, {nome}! Aqui é do Tô em Dia 😊 Vi que você entrou na nossa lista. Você está entre os primeiros, então garante o preço de fundador: R$14,90 por mês, para sempre. Posso te explicar como funciona?",

  // Mostra a barra para trocar entre as 3 versões (deixe false no ar)
  SHOW_SWITCHER: false
};
