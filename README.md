# Scout Eclipse Talveila

PWA mínima para scouting previo del eclipse solar del **12/08/2026** en **Talveila (Soria)** y alrededores.

## Qué hace

- Cámara trasera a pantalla completa.
- Overlay simple con:
  - punto del Sol a las `19:30`
  - punto del Sol a las `20:30`
  - trayectoria `19:30 → 20:30`
  - línea de horizonte `0°`
  - altura a las `20:30`
  - dirección cardinal
- Estado rápido:
  - `VISIBLE`
  - `JUSTO`
  - `TAPADO`
- Botón único `Ajustar dirección` para corregir el offset de brújula y guardarlo en local.
- Fallback automático a simulación si falla cámara, orientación o permisos.

## Uso en campo

1. Abre la app en HTTPS.
2. Si Safari pide permisos, concede cámara y orientación.
3. Mira el overlay.
4. Si la trayectoria no cae donde esperas, apunta hacia la referencia visual del Sol de las `20:30` y pulsa `Ajustar dirección`.
5. Si el punto de las `20:30` queda detrás de la loma o montaña, ese sitio no sirve.

## Filosofía

- Sin inputs de fecha u hora.
- Sin paneles complejos.
- Sin calibraciones avanzadas.
- Centrada solo en Talveila y el scouting del tramo `19:30 → 20:30`.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Limitaciones

- En iPhone/Safari la orientación necesita permiso desde un toque del usuario.
- La clasificación `VISIBLE / JUSTO / TAPADO` usa horizonte base `0°`; el relieve real se interpreta visualmente sobre la cámara.
- La corrección `Ajustar dirección` es simple y práctica, no una calibración astronómica completa.

## Seguridad

Nunca mires directamente al Sol sin protección homologada. Esta app solo sirve para encontrar y evaluar sitios de observación.
