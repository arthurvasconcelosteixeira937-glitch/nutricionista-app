import { methodLabel } from "./constants";
import { formatDate, formatMoney, formatPhone } from "./format";
import type { Language, PaymentMethod } from "./types";

export interface ReceiptData {
  number: number;
  language: Language;
  businessName: string;
  ownerName: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string | null;
  description: string;
  serviceDate: string;
  amount: number;
  paidDate: string;
  payments: { paid_on: string; method: PaymentMethod; amount: number }[];
}

const T = {
  es: {
    title: "RECIBO DE PAGO",
    number: "Recibo N.º",
    date: "Fecha",
    billTo: "CLIENTE",
    description: "DESCRIPCIÓN",
    serviceDate: "FECHA DEL SERVICIO",
    amount: "MONTO",
    payments: "PAGOS RECIBIDOS",
    method: "Método",
    total: "TOTAL PAGADO",
    paid: "PAGADO",
    thanks: "¡Gracias por su preferencia!",
    generated: "Recibo generado con Cóbralo",
  },
  en: {
    title: "PAYMENT RECEIPT",
    number: "Receipt #",
    date: "Date",
    billTo: "BILL TO",
    description: "DESCRIPTION",
    serviceDate: "SERVICE DATE",
    amount: "AMOUNT",
    payments: "PAYMENTS RECEIVED",
    method: "Method",
    total: "TOTAL PAID",
    paid: "PAID",
    thanks: "Thank you for your business!",
    generated: "Receipt generated with Cóbralo",
  },
};

export function receiptNumber(n: number) {
  return String(n).padStart(6, "0");
}

export function receiptFileName(n: number, lang: Language) {
  return `${lang === "en" ? "receipt" : "recibo"}-${receiptNumber(n)}.pdf`;
}

export function receiptShareText(d: Pick<ReceiptData, "language" | "clientName" | "number" | "businessName">) {
  const name = d.clientName.trim().split(/\s+/)[0];
  return d.language === "en"
    ? `Hi ${name}, here is your payment receipt #${receiptNumber(d.number)}. Thank you! — ${d.businessName}`
    : `Hola ${name}, te envío el recibo de pago N.º ${receiptNumber(d.number)}. ¡Gracias! — ${d.businessName}`;
}

/** Las fuentes estándar del PDF solo soportan Latin-1 (incluye á, é, ñ, ¿, ¡). */
function latin1(s: string) {
  return s.replace(/[^\x00-\xFF]/g, "").trim();
}

const GREEN: [number, number, number] = [15, 81, 50];
const LIGHT: [number, number, number] = [209, 242, 224];
const INK: [number, number, number] = [26, 26, 26];
const MUTED: [number, number, number] = [107, 114, 128];

export async function buildReceiptPdf(d: ReceiptData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const t = T[d.language];
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 0;

  doc.setProperties({ title: `${t.title} ${receiptNumber(d.number)}`, creator: "Cóbralo" });

  // Encabezado
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 120, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const business = latin1(d.businessName) || latin1(d.ownerName);
  doc.text(doc.splitTextToSize(business, W / 2), M, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  if (d.ownerName && latin1(d.ownerName) !== business) doc.text(latin1(d.ownerName), M, 92);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(t.title, W - M, 50, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${t.number} ${receiptNumber(d.number)}`, W - M, 72, { align: "right" });
  doc.text(`${t.date}: ${formatDate(d.paidDate)}`, W - M, 90, { align: "right" });

  // Cliente
  y = 168;
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(t.billTo, M, y);
  y += 20;
  doc.setTextColor(...INK);
  doc.setFontSize(15);
  doc.text(latin1(d.clientName), M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y += 18;
  doc.text(formatPhone(d.clientPhone), M, y);
  if (d.clientAddress) {
    y += 16;
    doc.text(doc.splitTextToSize(latin1(d.clientAddress), W / 2), M, y);
  }

  // Tabla del servicio
  y = Math.max(y + 40, 260);
  const colDate = W - M - 210;
  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W - 2 * M, 30, "F");
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(t.description, M + 12, y + 19);
  doc.text(t.serviceDate, colDate, y + 19);
  doc.text(t.amount, W - M - 12, y + 19, { align: "right" });

  y += 30;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const descLines = doc.splitTextToSize(latin1(d.description), colDate - M - 30);
  const rowH = Math.max(36, descLines.length * 15 + 20);
  doc.text(descLines, M + 12, y + 22);
  doc.text(formatDate(d.serviceDate), colDate, y + 22);
  doc.text(formatMoney(d.amount), W - M - 12, y + 22, { align: "right" });
  y += rowH;
  doc.setDrawColor(229, 231, 235);
  doc.line(M, y, W - M, y);

  // Pagos
  y += 34;
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(t.payments, M, y);
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  for (const p of d.payments) {
    y += 20;
    doc.text(`${formatDate(p.paid_on)}  ·  ${t.method}: ${methodLabel(p.method, d.language)}`, M, y);
    doc.text(formatMoney(p.amount), W - M - 12, y, { align: "right" });
  }

  // Total
  y += 36;
  const total = d.payments.reduce((acc, p) => acc + Math.round(p.amount * 100), 0) / 100;
  doc.setFillColor(...GREEN);
  doc.roundedRect(W - M - 240, y, 240, 56, 10, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(t.total, W - M - 224, y + 24);
  doc.setFontSize(20);
  doc.text(formatMoney(total), W - M - 16, y + 37, { align: "right" });

  // Sello "PAGADO"
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(2.5);
  doc.roundedRect(M, y + 6, 130, 44, 8, 8, "S");
  doc.setTextColor(...GREEN);
  doc.setFontSize(22);
  doc.text(t.paid, M + 65, y + 36, { align: "center" });

  // Pie
  const H = doc.internal.pageSize.getHeight();
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(t.thanks, W / 2, H - 90, { align: "center" });
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(t.generated, W / 2, H - 70, { align: "center" });

  return doc.output("blob");
}
