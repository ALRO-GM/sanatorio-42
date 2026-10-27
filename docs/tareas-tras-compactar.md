# Tareas tras compactar (2026-10-27)

En producción 907f793 (si el despliegue terminó bien): consumo de la API de 42
por función y por persona con topes por hora (`docs/consumo-api.md`), cuota solo
horaria en el panel, y copia de correcciones por tramos de ids (e0825ce).

Mirar:

- Que la copia de correcciones de París termine (`sync:status`: «histórico
  completo» del campus 1) y que los repasos diarios de los demás campus avancen.
- En el panel, que las funciones salgan con nombre; una clave nueva sin texto
  sale tal cual: añadirla a `admin.api.f.*` en `gestion.csv`.
- Piscina de Madrid (2026-10-27): sus correcciones coinciden con 42 (11 con nota
  desde el 26); las que no tienen nota no se guardan.
