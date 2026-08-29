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
- **localStorage** para persistir los movimientos (migrable a IndexedDB si crece).

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
