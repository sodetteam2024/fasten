// app/layout.js
import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "Fasten",
  description: "Portal de residentes",
  icons: {
    icon: '/fasten.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="relative min-h-screen overflow-x-hidden font-sans">
        <ClerkProvider>
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-400 opacity-40 blur-3xl rounded-full" />
          <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-pink-400 opacity-40 blur-3xl rounded-full" />
          <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-indigo-400 opacity-40 blur-3xl rounded-full" />

          <div className="relative z-10">
            <Header />
            <main className="container mx-auto px-4">{children}</main>
          </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
