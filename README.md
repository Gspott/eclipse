# Eclipse Field Finder 2026

PWA móvil especializada para iPhone/Safari que ayuda a localizar el Sol durante el eclipse solar del **12 de agosto de 2026** en **España**, con funcionamiento local y sin backend.

## Qué hace

- Visor con cámara trasera y HUD de campo.
- Modo `Eclipse` ultra simple para uso real el 12/08/2026.
- Cálculo local de altura/azimut solar para la tarde del `2026-08-12`.
- Modo "apunta y busca" con error angular horizontal/vertical en tiempo real.
- Calibración `Alinear con el Sol ahora` para corregir offset real del iPhone en azimut y elevación.
- Score de confianza del sensor con suavizado configurable.
- Ficha del lugar con estimación de parcial/total, máximo, fin y puesta.
- Perfil manual del horizonte por azimut/elevación, con captura congelada, edición de puntos y export/import.
- Simulación sin cámara para planificar antes del día.
- Mapa simple offline para exploración previa.
- Persistencia local de calibración, horizonte, ubicación y preferencias.
- PWA instalable con `manifest.json` y `service-worker.js`.

## Arquitectura

- `src/lib/solar.ts`: cálculo solar local basado en fórmulas tipo NOAA.
- `src/lib/eclipse.ts`: heurística específica para España y el eclipse del 12/08/2026.
- `src/lib/horizon.ts`: perfil angular del horizonte y evaluación visible/oculto.
- `src/lib/scoring.ts`: score del sitio con ventana visible alrededor del máximo.
- `src/hooks/`: acceso encapsulado a geolocalización, orientación, visibilidad de página, cámara y persistencia local.
- `src/components/`: vistas de visor, modo eclipse, simulación, calibración, ficha del lugar y editor de horizonte.
- `public/service-worker.js`: caché básico para uso offline tras la primera carga.

La app **no es astronómica genérica**. Está fijada a la fecha del eclipse y optimizada para el uso vespertino en España.

## Estructura

```text
src/
  components/
  hooks/
  lib/
  data/
  styles/
public/
manifest.json
service-worker.js
README.md
```

## Requisitos

- Node.js 18+.
- HTTPS en despliegue real si se quiere usar cámara y sensores.
- Safari iPhone para la experiencia objetivo.

## Desarrollo local

```bash
npm install
npm run dev
```

Vite abrirá la app en local. Para probar sensores y cámara en iPhone conviene usar una URL HTTPS real o un túnel seguro.

## Build

```bash
npm run build
npm run preview
```

## Despliegue

### GitHub Pages

1. Ejecuta `npm install`.
2. Ejecuta `npm run build`.
3. Publica la carpeta `dist/` en GitHub Pages.
4. Si el proyecto no vive en raíz, ajusta `base` en `vite.config.ts`.

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`

### Vercel

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

## Uso recomendado en iPhone

1. Abrir la web en HTTPS.
2. Añadir a pantalla de inicio si se quiere usar como PWA.
3. Conceder permisos de geolocalización, cámara y orientación.
4. Pasar por la pantalla de calibración.
5. En el sitio real, apuntar manualmente al Sol con la protección adecuada y pulsar `Alinear con el Sol ahora`.
6. Congelar una captura y marcar la línea de cresta si hay relieve relevante.
7. Cambiar a `Modo eclipse` para el uso final de campo.

## Flujo ideal de campo el 12/08/2026

1. Cargar la app con cobertura antes de salir al campo.
2. Verificar que la PWA abre correctamente sin red.
3. Llegar al lugar con antelación y activar GPS.
4. Abrir cámara trasera y permiso de orientación desde un toque.
5. Hacer calibración solar real.
6. Perfilar el horizonte por azimut si hay lomas, árboles o edificios.
7. Revisar `Ficha del lugar` y `Simulación` para confirmar margen.
8. Usar `Modo eclipse` durante el tramo crítico.
9. Si la confianza del sensor cae a baja, activar `Manual ON` y usar heading/pitch manuales.

## Calibración recomendada el día real

- Orienta el teléfono hacia el Sol solo con protección homologada o usando una referencia segura.
- Mantén el iPhone quieto 2-3 segundos para que baje el jitter.
- Pulsa `Alinear con el Sol ahora`.
- Repite la calibración si:
  - cambias de sitio varios kilómetros,
  - giras mucho entre vertical y horizontal,
  - Safari empieza a derivar,
  - o la app indica confianza baja.
- Usa el ajuste fino solo como corrección secundaria.

## Datos de ejemplo incluidos

- A Coruña
- Oviedo
- León
- Burgos
- Bilbao
- Zaragoza
- Valencia
- Palma
- Madrid
- Barcelona
- Sevilla
- Málaga

## Modo demo

La vista `Demo` permite:

- fijar una ciudad de ejemplo,
- probar la app sin GPS real,
- simular hora del eclipse,
- simular orientación heading/pitch/roll,
- mantener la fecha interna del eclipse,
- y validar UI, HUD, scoring, horizonte y simulación.

## Limitaciones conocidas

- La orientación en iPhone/Safari puede derivar varios grados y requiere calibración manual frecuente.
- `DeviceOrientationEvent.requestPermission()` solo funciona tras interacción del usuario.
- La posición del marcador solar en cámara usa una proyección aproximada basada en FOV configurable, no una calibración fotogramétrica exacta.
- El modo `Alinear con el Sol ahora` mejora mucho la utilidad real, pero sigue dependiendo de que el usuario apunte correctamente en ese instante.
- La clasificación total/parcial usa una **aproximación local de la banda de totalidad en España**, no cartografía oficial a resolución fina.
- El horizonte por azimut depende de la calidad del perfil que se dibuje. Si el relieve es complejo, conviene más densidad de puntos.
- El service worker incluido es básico y suficiente para una primera carga y reutilización offline, pero no implementa estrategias avanzadas de versionado.
- La vibración/haptics depende de la compatibilidad del navegador.
- La instalación en iPhone como PWA puede no respetar siempre el bloqueo de orientación solicitado por la app.
- iPhone/Safari puede suspender sensores o cámara al cambiar de app o bloquear pantalla; al volver conviene revisar calibración.

## Precisión y honestidad

La app está pensada como **herramienta de campo útil**, no como instrumento científico. Cuando la brújula o la proyección son poco fiables, el flujo correcto es:

- ajustar offset manual,
- recalibrar horizonte,
- y tratar la lectura como ayuda práctica, no como verdad absoluta.

## Verificaciones manuales mínimas

1. Sin permisos:
   Debe seguir funcionando `Simulación`, `Mapa simple` y `Demo`.
2. Con cámara denegada:
   El visor debe mostrar fallback y no bloquear el resto.
3. Con orientación denegada:
   La app debe permitir offsets manuales y seguir mostrando datos solares.
4. Cambiando ciudad demo:
   Deben actualizarse ficha del lugar, score y timeline.
5. Capturando una imagen:
   Debe poderse dibujar, editar y borrar un perfil manual del horizonte.
6. Offline tras primera carga:
   La app debe volver a abrir recursos ya cacheados.
7. Calibración solar:
   Debe actualizar offsets y mostrar precisión estimada.
8. Confianza baja del sensor:
   Debe avisar y permitir pasar a orientación manual.

## Notas de implementación

- La fecha operativa es siempre `2026-08-12`.
- El horario usado es el local del dispositivo, pensado para España peninsular en verano.
- Todos los cálculos se ejecutan en el navegador.
- El hook de orientación aplica low-pass filter y limitación de FPS para reducir jitter y consumo.
- Cuando la pestaña no está visible, los updates se relajan para ahorrar batería.

## Seguridad observacional

Nunca mirar directamente al Sol sin filtros homologados durante las fases parciales. La app no sustituye protección ocular ni planificación de seguridad.

- No uses la cámara del iPhone como método de observación directa del Sol sin criterio y protección adecuados.
- La alineación manual con el Sol debe hacerse con extrema prudencia.
