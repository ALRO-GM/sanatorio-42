# Tareas tras compactar (2026-10-27)

En producción (si el último despliegue terminó bien) f5bb418:

- Consumo de la API de 42 por función y por persona, con topes por hora
  (`docs/consumo-api.md`); cuota solo horaria en el panel.
- Copia de correcciones por tramos de ids: París completa hasta hoy.
- Pomodoro con sonido de fondo (`docs/pomodoro-sonidos.md`).
- Caché en el PC: service worker, ETag y sonidos con `Range`
  (`docs/rendimiento.md`, apartado 8).

Mirar:

- Que Alberto escuche las diez pistas lo-fi: su orden de intensidad salió de
  una medición, no de escucharlas.
- Que los repasos diarios de correcciones de los demás campus terminen.
- En el panel, funciones sin nombre: añadirlas a `admin.api.f.*` en `gestion.csv`.
- Para convertir audio hay un ffmpeg en un `.venv` con `imageio-ffmpeg` (no
  está instalado en el sistema).
