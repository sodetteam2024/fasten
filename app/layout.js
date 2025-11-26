// app/layout.js
import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "Fasten",
  description: "Portal de residentes",
  icons: {
    icon: "/ico_new.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-100 font-sans">
        <ClerkProvider>
          {/* Fondo limpio, sin blobs de colores */}
          <Header />
          <main className="container mx-auto px-4">
            {children}
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
