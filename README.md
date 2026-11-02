# PulsoLocal · Frontend

Interfaz web de **PulsoLocal**, un dashboard que convierte las reseñas de los clientes de un negocio pequeño en
temas, sentimiento y recomendaciones concretas, con inteligencia artificial.

> Proyecto final · Programación Orientada a la Web · Ingeniería de Software · UCC Pasto
> Backend, arquitectura completa y decisiones de seguridad: repositorio `pulso-local-backend` (`docs/ARQUITECTURA.md`).

**En línea:** https://pulso-local-frontend.vercel.app · usuario demo `demo@pulsolocal.co` / `Galeras2026Pasto`

## Qué hace

- Registro e inicio de sesión (cookie de sesión `httpOnly`; el token nunca está al alcance de JavaScript).
- Negocios: crear, editar y eliminar (con confirmación escribiendo el nombre).
- Reseñas: importar CSV o texto pegado, plantilla CSV descargable, buscar, filtrar por sentimiento, tema y
  estrellas, ordenar y eliminar.
- Análisis con IA (Gemini): indicadores, recomendaciones priorizadas con su evidencia, sentimiento general,
  temas recurrentes, **evolución** frente al análisis anterior, **tendencia mensual**, historial con reintentos y
  consumo de tokens.
- Exportar a CSV y **reporte imprimible en PDF**.
- Mi cuenta: cambio de contraseña (cierra las demás sesiones) y eliminación de la cuenta (Ley 1581 de 2012).
- Tema claro, oscuro o según el sistema.

## Stack

| | |
|---|---|
| UI | React 19 + TypeScript 7 + Vite 8 |
| Estilos | Tailwind CSS 4 con tokens de diseño propios (`src/index.css`) |
| Rutas | React Router 8, páginas con carga diferida (`React.lazy`) |
| Calidad | Biome (lint y formato), Vitest + Testing Library, Playwright |
| Despliegue | Vercel (proxy `/api` → backend en Render) o Docker + nginx |

## Estructura

```
src/
├── api/          HttpClient (fachada sobre fetch), servicios por recurso, tipos del contrato
├── auth/         AuthContext, guardia de rutas y safeRedirect (anti open redirect)
├── components/   UI base, gráficos, notificaciones, diálogo de confirmación, ErrorBoundary…
├── hooks/        tema, sondeo de análisis, título de página, exportación
├── pages/        Auth, Negocios, Dashboard, Mi cuenta, 404
├── App.tsx       mapa de rutas
└── main.tsx      proveedores (errores, router, notificaciones, confirmación, sesión)
e2e/              pruebas end-to-end (Playwright)
```

## Decisiones importantes

- **Un solo origen.** El código llama a rutas relativas (`/api/...`). En desarrollo las reenvía Vite
  (`vite.config.ts`); en producción, Vercel (`vercel.json`). Así la cookie `SameSite=Strict` viaja sin abrir CORS.
- **CSRF.** Toda petición lleva `X-Requested-With: PulsoLocal`; el backend rechaza las que modifican estado sin él.
- **Sin HTML inyectado.** React escapa todo el texto (reseñas incluidas); no se usa `dangerouslySetInnerHTML`.
  CSP estricta en `vercel.json` y `nginx.conf`.
- **Accesibilidad.** Enlace "Saltar al contenido", foco al contenido en cada navegación, títulos por página,
  notificaciones con `aria-live`, diálogo nativo `<dialog>`, radios nativos en el selector de tema, colores de
  sentimiento validados para daltonismo y gráficos con tabla equivalente.

## Desarrollo

Requiere el backend corriendo en `http://localhost:4000` (ver su README).

```bash
npm install
npm run dev          # http://localhost:5180
```

| Script | |
|---|---|
| `npm run build` | chequeo de tipos + build de producción |
| `npm run check` | lint y formato con Biome |
| `npm test` | pruebas unitarias (Vitest + Testing Library, jsdom) |
| `npm run e2e` | pruebas end-to-end con Playwright contra la app corriendo (`E2E_BASE_URL` para otra URL) |

El CI de GitHub Actions ejecuta Biome, tipos, pruebas unitarias, auditoría de dependencias y build en cada push.
