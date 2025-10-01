import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define rutas públicas (sign-in, sign-up y la página raíz)
const publicRoutes = createRouteMatcher([
  "/inicio(.*)",
  "/registro(.*)",
  "/visitas",
  "/",
]);

export default clerkMiddleware((auth, req) => {
  // Si la ruta NO es pública, protegemos el acceso
  if (!publicRoutes(req)) {
    auth();
  }
});

export const config = {
  matcher: [
    // Ignorar archivos estáticos y rutas internas
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|ico|webp|ttf|woff2|json)).*)",
  ],
};
