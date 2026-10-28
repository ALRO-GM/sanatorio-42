# Tareas tras compactar (2026-10-27)

En producción hasta 437ccea; 559f053 (uniones de la persona elegida en la Red)
estaba esperando a que la CI saliera en verde: comprobar que se desplegó
(`tail -1 infra/deploy.log` en el servidor) o volver a lanzarlo.

Mirar:

- Historial de asientos: `npm run sync:status` («Historial de asientos del
  campus 22»). Madrid primero; luego los demás. Unas 8 500 peticiones.
- Startup del Pomodoro: ajustar precios y requisitos cuando haya uso
  (`packages/startup/src/data.ts`).
- Que Alberto escuche las lo-fi (orden por medición, no escuchado) y pruebe el
  sonido con el móvil bloqueado.
