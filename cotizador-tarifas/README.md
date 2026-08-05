# Cotizador de tarifas

App de React (Vite) para cotizar tarifas de transporte por unidad, ruta y
rotación mensual. Vive como subproyecto dentro de este repo, independiente del
sitio estático de la raíz (`Master de Ruta`).

## Desarrollo local

```bash
cd cotizador-tarifas
npm install
npm run dev
```

## Build

```bash
npm run build
```

Genera la carpeta `dist/` (estática, sin dependencias de servidor).

## Despliegue en Vercel

Como proyecto de Vercel independiente, con:

- **Root Directory:** `cotizador-tarifas`
- **Framework Preset:** Vite (autodetectado)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

## Nota sobre el backend

`src/App.jsx` guarda las cotizaciones en un Google Sheet vía un Apps Script
publicado como `/exec` (constante `APPS_SCRIPT_URL`). Si este repo se hace
público, esa URL queda visible — considera moverla a una variable de entorno
si eso te preocupa.
