# 🪙 Bolsillo

App de finanzas personales (PWA) para llevar el control de ingresos, gastos,
presupuestos y metas de ahorro. Pensada para Colombia: pesos, cuentas como
Nequi y Bancolombia, y tarjetas de crédito con fecha de corte y de pago.

Principio de diseño: **registrar un gasto debe costar menos de 5 segundos.**
Si registrar cuesta, la app se abandona.

## Stack

- **React 19** + **Vite** — SPA rápida, base para PWA.
- **PWA nativa** — `manifest.webmanifest` + service worker propio (sin dependencias
  pesadas). Instalable y funciona offline.
- **Supabase** (PostgreSQL + Auth) como backend: base de datos en la nube y login.
  Sin credenciales configuradas, la app funciona en modo local (localStorage).

## Correr en local

```bash
npm install      # instala dependencias (solo la primera vez)
npm run dev      # servidor de desarrollo → http://localhost:5173
npm run build    # build de producción en /dist
npm run preview  # sirve el build (aquí sí se activa el service worker / PWA)
```

## Estructura

```
bolsillo/
├─ public/
│  ├─ manifest.webmanifest   # metadatos PWA
│  ├─ sw.js                  # service worker (cache del app shell)
│  └─ icon*.svg              # íconos de la app
├─ src/
│  ├─ main.jsx               # punto de entrada + registro del SW
│  ├─ App.jsx                # shell: navegación, tema, hoja de registro
│  ├─ screens.jsx            # pantallas: Inicio, Presupuestos, Reportes, Metas
│  ├─ data.js                # datos de ejemplo + helpers + localStorage
│  ├─ icons.jsx              # set de íconos SVG
│  └─ index.css             # tokens de diseño y estilos
└─ design/
   └─ prototipo.html         # prototipo visual navegable (referencia de diseño)
```

## Backend (Supabase)

El backend es **Supabase**: una base de datos PostgreSQL en la nube más login,
sin servidor propio que mantener. El esquema de la base está en
[`supabase/schema.sql`](supabase/schema.sql).

### Conectar tu proyecto

1. Creá una cuenta y un proyecto en [supabase.com](https://supabase.com) (plan gratis).
2. En el panel de Supabase: **SQL Editor → New query**, pegá el contenido de
   `supabase/schema.sql` y dale **Run**. Eso crea las tablas y la seguridad.
3. En **Project Settings → API** copiá el **Project URL** y la **anon public key**.
4. En la carpeta del proyecto, copiá `.env.example` como `.env` y pegá esos dos valores.
5. `npm run dev` — la app ahora usa la nube.

> El archivo `.env` guarda tus credenciales y **no se sube a GitHub** (está en
> `.gitignore`). Nunca lo compartas ni lo publiques.

## Estado actual

Funciona el esqueleto: navegación entre pantallas, tema claro/oscuro, y el
registro rápido que agrega movimientos y los guarda en el navegador.
Los datos son de ejemplo.

## Próximos pasos (roadmap)

- [ ] Modelo de datos real (cuentas, categorías y presupuestos editables)
- [ ] Editar y borrar movimientos
- [ ] Gastos recurrentes y recordatorios
- [ ] Gráficas reales (dona por categoría, tendencia mensual) con datos vivos
- [ ] Tarjetas de crédito con corte/pago y cálculo de cupo
- [ ] Bloqueo con PIN/biometría y respaldo en la nube
- [ ] Multi-moneda

---
Datos de ejemplo, no reales. Proyecto personal.
