# Plan de Integración de Métricas de Sprint & Task Time Tracking — TaskFlow SaaS

Para hacer que **TaskFlow SaaS (Proyecto #5)** sea verdaderamente impecable e insuperable, agregaremos la sección de **Métricas de Sprint**, el **Cronómetro de Registro de Tiempo individual por Tarea (Time Tracking)** y la integración completa del **Timer Pomodoro**.

---

## 🎯 Nuevas Funcionalidades a Implementar

### 1. 📊 Módulo de Métricas & Rendimiento del Sprint (`#nav-analytics`)
- **Panel de Métricas del Sprint**:
  - **Gráfico de Velocidad y Burndown**: Visualización gráfica (Chart.js / Canvas) del progreso de tareas completadas vs restantes en el Sprint.
  - **Distribución de Carga por Prioridad**: Gráfico de rosca/barras de tareas (Alta, Media, Baja).
  - **Puntuación de Salud del Sprint**: Porcentaje de cumplimiento, tareas en riesgo y tiempo promedio de resolución.

### 2. ⏱️ Registro de Tiempo por Tarea (Task Time Tracking)
- **Timer Individual en cada Tarjeta de Tarea**:
  - Botón de **Iniciar / Detener Cronómetro** (`Play/Pause`) en cada tarjeta de tarea.
  - Medidor de tiempo invertido (`time_spent` en minutos/horas, ej: `1h 45m`).
  - Guardado en tiempo real en **Supabase Cloud PostgreSQL** y en la base de datos local para que el tiempo acumulado persista por tarea.

### 3. 🍅 Timer Pomodoro Completo & Registro de Sesiones (`#nav-timer`)
- Cronómetro de enfoque (25 min trabajo / 5 min descanso) con modal/vista completa.
- Contador de sesiones Pomodoro completadas por el usuario.
- Notificaciones de sonido y alertas emergentes (*Toasts*) al terminar cada sesión de enfoque.

---

## 🗄️ Actualización del Esquema SQL (`schema.sql`)

Añadiremos el campo `time_spent` (tiempo invertido en segundos/minutos) a la tabla `tasks` en PostgreSQL:

```sql
-- Agregar columna para registro de tiempo por tarea
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;
```

---

## 📂 Archivos a Actualizar en `nuevo proyecto`

- [index.html](file:///c:/Users/Ronaldproxo/.gemini/antigravity-ide/brain/69c59ca0-e746-4bb1-be51-bdb2cb7bedc2/nuevo%20proyecto/index.html) — Agregar vistas modales de Métricas de Sprint, vista de Timer Pomodoro y cronómetro en tarjetas.
- [styles.css](file:///c:/Users/Ronaldproxo/.gemini/antigravity-ide/brain/69c59ca0-e746-4bb1-be51-bdb2cb7bedc2/nuevo%20proyecto/styles.css) — Estilos para visualizador de tiempo en tarjetas, gráficos de Sprint y panel Pomodoro.
- [app.js](file:///c:/Users/Ronaldproxo/.gemini/antigravity-ide/brain/69c59ca0-e746-4bb1-be51-bdb2cb7bedc2/nuevo%20proyecto/app.js) — Lógica de tracking de tiempo activo por tarea, generación de gráficos de métricas y persistencia.
- [schema.sql](file:///c:/Users/Ronaldproxo/.gemini/antigravity-ide/brain/69c59ca0-e746-4bb1-be51-bdb2cb7bedc2/nuevo%20proyecto/schema.sql) — Script SQL actualizado con la columna `time_spent`.
- [README.md](file:///c:/Users/Ronaldproxo/.gemini/antigravity-ide/brain/69c59ca0-e746-4bb1-be51-bdb2cb7bedc2/nuevo%20proyecto/README.md) — Actualización de la documentación en GitHub.

---

## 🛠️ Plan de Verificación

1. Iniciar y pausar el cronómetro de tiempo en una tarjeta de tarea específica y verificar que el tiempo acumulado aumente.
2. Comprobar que el tiempo invertido se guarde en Supabase / Backend.
3. Probar la navegación a la vista de Métricas & Sprint y verificar el cálculo de gráficos.
4. Subir la actualización corregida a GitHub.
