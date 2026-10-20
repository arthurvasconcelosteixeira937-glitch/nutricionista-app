import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { ServiceWorker } from "@/components/ServiceWorker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Cóbralo — Cobra a tus clientes por WhatsApp",
    template: "%s · Cóbralo",
  },
  description:
    "Anota tus trabajos y envía recordatorios de pago por WhatsApp en segundos. Todo en español. Para trabajadores independientes en Estados Unidos.",
  applicationName: "Cóbralo",
  appleWebApp: { capable: true, title: "Cóbralo", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Cóbralo — Deja de perder dinero con clientes que no pagan",
    description: "Anota tus trabajos y cobra por WhatsApp en segundos. Todo en español.",
    type: "website",
    locale: "es_US",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F5132",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-dvh">
        {children}
        <Toaster />
        <ServiceWorker />
      </body>
    </html>
  );
}
