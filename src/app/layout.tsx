import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Creatix CRM | Gestión Inteligente de Ventas y Clientes",
  description: "Optimice el embudo de ventas, administre contactos y automatice campañas con Creatix CRM. Diseñado para potenciar el crecimiento de su negocio.",
  openGraph: {
    title: "Creatix CRM | Gestión Inteligente de Ventas y Clientes",
    description: "La plataforma de CRM definitiva para administrar contactos, empresas, embudos de venta y campañas automatizadas de correo.",
    url: "https://creatixcrm.com",
    siteName: "Creatix CRM",
    type: "website",
    locale: "es_CO",
  },
  twitter: {
    card: "summary_large_image",
    title: "Creatix CRM | Gestión Inteligente de Ventas y Clientes",
    description: "La plataforma de CRM definitiva para administrar contactos, empresas, embudos de venta y campañas automatizadas de correo.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
