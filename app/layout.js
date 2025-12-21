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
      <body className="font-sans">
        <ClerkProvider>
          {/* Overlay para legibilidad sobre imagen */}
          <div className="min-h-screen bg-white/70 dark:bg-black/60 backdrop-blur-[2px]">
            <Header />
            <main className="container mx-auto px-4 py-6">
              {children}
            </main>
          </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
