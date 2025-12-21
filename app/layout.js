import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import Providers from "./providers";

export const metadata = {
  title: "Fasten",
  description: "Portal de residentes",
  icons: { icon: "/ico_new.ico" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <ClerkProvider>
          <Providers>
            <Header />
            <main className="container mx-auto px-4">{children}</main>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
