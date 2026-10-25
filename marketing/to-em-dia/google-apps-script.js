/**
 * Tô em Dia — recebe os cadastros da página e salva numa planilha do Google.
 *
 * Como usar (5 minutos):
 * 1. Crie uma planilha nova no Google Sheets (sheets.new).
 * 2. Menu Extensões → Apps Script. Apague o que tiver e cole este arquivo inteiro.
 * 3. Clique em Implantar → Nova implantação → tipo "App da Web".
 *    - Executar como: Eu
 *    - Quem pode acessar: Qualquer pessoa
 * 4. Autorize com sua conta Google e copie o link que termina em /exec.
 * 5. Cole esse link em SHEET_URL, no topo do script da página (index.html).
 */
const COLUNAS = ["data", "nome", "whatsapp", "trabalho", "das_atrasado", "versao", "utm_source", "utm_campaign", "utm_content"];

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUNAS);
  const lead = JSON.parse(e.postData.contents || "{}");
  sheet.appendRow(COLUNAS.map((c) => String(lead[c] || "").slice(0, 200)));
  return ContentService.createTextOutput("ok");
}
