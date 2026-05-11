# TEA Setter Dashboard

Dashboard de ventas para Talk English Academy — conectado a FunnelUp (GoHighLevel API v2).

## Setup local

```bash
npm install
cp .env.local.example .env.local
# Editar .env.local con tu API key y Pipeline ID
npm run dev
```

## Variables de entorno necesarias

En Vercel → Settings → Environment Variables:

| Variable | Valor |
|---|---|
| `GHL_API_KEY` | Tu token de la integración privada "TEA Setter Dashboard" |
| `GHL_LOCATION_ID` | `9cXtL7yJiTR3U0C2xmDt` |
| `GHL_PIPELINE_ID` | ID del pipeline "TEA - Línea de Ventas" |
| `NEXT_PUBLIC_GHL_LOCATION_ID` | `9cXtL7yJiTR3U0C2xmDt` |

## Cómo obtener el Pipeline ID

1. Ir a FunnelUp → Clientes Potenciales
2. Seleccionar "TEA - Línea de Ventas"
3. En la URL verás algo como `/pipelines/XXXXXXXX` — ese es el ID
4. O llamar a `/api/pipelines` después del deploy y buscarlo en la respuesta

## Deploy en Vercel

1. Push al repo de GitHub
2. Importar en Vercel → New Project
3. Agregar las 4 variables de entorno
4. Deploy

## Estructura del proyecto

```
app/
  page.tsx          ← Dashboard principal
  layout.tsx        ← Layout raíz
  api/
    leads/          ← GET: todos los leads del pipeline
    opportunity/    ← PUT: actualizar stage
    notes/          ← GET/POST: notas del contacto
    pipelines/      ← GET: pipelines disponibles
data/
  scripts.ts        ← Los 12 guiones de venta TEA
lib/
  ghl.ts            ← Cliente API de GoHighLevel v2
```
