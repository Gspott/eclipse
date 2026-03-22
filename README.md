# Scout Eclipse Talveila

PWA mínima para scouting del eclipse solar del **12/08/2026** en **Talveila (Soria)**.

## Flujo

- Una sola pantalla principal.
- Cámara trasera fullscreen.
- Fallback automático a simulación si falla cámara o orientación.
- Dos botones grandes:
  - `Ajustar horizonte`
  - `Cámara / Simulación`

## Qué muestra

- Punto del Sol a las `19:30`.
- Punto del Sol a las `20:30`.
- Trayectoria entre ambas horas.
- Línea de horizonte.
- Altura del Sol y dirección cardinal.
- Estado rápido:
  - `VISIBLE`
  - `JUSTO`
  - `TAPADO`

## Uso en campo

1. Abre la app en HTTPS desde iPhone/Safari.
2. Concede cámara y orientación si Safari lo pide.
3. Mira la trayectoria sobre la cámara.
4. Si el horizonte visual no coincide, apunta al horizonte real y pulsa `Ajustar horizonte`.
5. Si el punto de las `20:30` cae detrás del relieve, ese sitio no sirve.

## Nota importante

La proyección ya no dibuja el Sol si queda detrás del usuario o fuera del campo visible. Esto evita efectos de “dos soles” al girar 180°.
El horizonte usa la misma proyección que los puntos solares y la trayectoria.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Seguridad

Nunca mires directamente al Sol sin protección homologada. Esta app es solo una ayuda de scouting visual del sitio.
