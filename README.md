# ⚡ TaskFlow SaaS — Hybrid Supabase Cloud & Node.js Full-Stack Workspace

**TaskFlow SaaS** es una plataforma **Full-Stack nivel Producción / Enterprise** inspirada en Trello y Linear. Soporta una arquitectura híbrida con **Supabase Cloud (PostgreSQL + Auth + RLS)** y respaldo local en **Node.js REST API**.

![TaskFlow SaaS Banner](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80)

---

## ☁️ Arquitectura Full-Stack en la Nube

```
                              ┌──────────────────────────────────┐
                              │  Supabase Cloud (PostgreSQL)     │
                              │  - Auth JWT                      │
                              │  - Tabla tasks + RLS Policies    │
                              └────────────────┬─────────────────┘
                                               │
                                               ▼
   ┌────────────────────────┐    HTTP / WebSockets Realtime     ┌────────────────────────┐
   │    Client Frontend     │  ◄──────────────────────────────► │     Node.js Engine     │
   │ (HTML5, CSS3, JS App)  │                                   │  (Respaldo REST Local) │
   └────────────────────────┘                                   └────────────────────────┘
```

---

## 🛠️ Guía Rápida de Configuración en Supabase Cloud (2 Minutos)

1. **Crea un Proyecto Gratis en Supabase**:
   - Ingresa a [https://supabase.com](https://supabase.com) y crea un nuevo proyecto.

2. **Ejecuta el Script de Base de Datos SQL**:
   - Copia el contenido del archivo [`schema.sql`](./schema.sql).
   - En tu panel de Supabase, ve al menú izquierdo a **SQL Editor** ➔ **New Query**.
   - Pega el código SQL y presiona **Run**. Esto creará la tabla `tasks`, sus índices y las políticas de seguridad **Row Level Security (RLS)**.

3. **Conecta tus llaves API**:
   - En Supabase, ve a **Project Settings** ➔ **API**.
   - Copia la **Project URL** y la **anon / public Key**.
   - Ábrelo en el archivo `supabaseClient.js`:
     ```javascript
     const SUPABASE_CONFIG = {
         url: 'https://tu-proyecto.supabase.co',
         anonKey: 'tu-anon-public-key'
     };
     ```

¡Listo! La aplicación detectará tus llaves y se conectará automáticamente a tu base de datos **PostgreSQL en la Nube**.

---

## ✨ Características Destacadas

- ⚡ **Base de Datos PostgreSQL Cloud**: Almacenamiento seguro administrado por Supabase.
- 🔒 **Row Level Security (RLS)**: Las tareas de cada usuario están protegidas y aisladas a nivel de motor de base de datos SQL.
- 🔐 **Autenticación Nativa JWT**: Registro e inicio de sesión seguro con contraseñas encriptadas.
- 📌 **Tablero Kanban Drag & Drop**: Movimiento de tareas entre columnas con persistencia instantánea.
- ⏱️ **Timer Pomodoro**: Modo de enfoque de 25 minutos.
- 📤 **Exportación CSV**: Descarga de reportes filtrados por usuario.

---

## 📄 Licencia

MIT License — Libre para uso comercial, demostración en portafolios de desarrollo web Full-Stack y proyectos educacionales.
