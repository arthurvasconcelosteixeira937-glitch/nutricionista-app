import type { Metadata, Viewport } from "next";
import { RegisterSW } from "@/components/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "CobroSeguro — Se acabaron los comprobantes falsos",
    template: "%s · CobroSeguro",
  },
  description:
    "Cobra por WhatsApp y entrega solo cuando el pago está confirmado de verdad. OXXO, SPEI y tarjeta con tu cuenta de Mercado Pago.",
  applicationName: "CobroSeguro",
  appleWebApp: { capable: true, title: "CobroSeguro", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  openGraph: {
    title: "CobroSeguro — Se acabaron los comprobantes falsos",
    description: "Cobra por WhatsApp y entrega solo cuando el pago está confirmado de verdad.",
    locale: "es_MX",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
