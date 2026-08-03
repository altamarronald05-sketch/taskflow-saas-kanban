# ⚡ TaskFlow SaaS — Hybrid Supabase Cloud & Node.js Full-Stack Workspace

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://taskflow-saas-kanban.vercel.app)
[![Supabase PostgreSQL](https://img.shields.io/badge/Supabase-Cloud_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Node.js API](https://img.shields.io/badge/Node.js-REST_API-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)

**TaskFlow SaaS** es una plataforma **Full-Stack nivel Producción / Enterprise** inspirada en Trello y Linear. Soporta una arquitectura híbrida con **Supabase Cloud (PostgreSQL + Auth + RLS)** y respaldo local en **Node.js REST API**.

![TaskFlow SaaS Banner](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80)

---

## 🚀 Enlace de Demo En Vivo (Live Production Demo)

🌐 **Prueba la aplicación web en producción:**  
👉 [https://taskflow-saas-kanban.vercel.app](https://taskflow-saas-kanban.vercel.app)

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
         url: 'https://csmlbcbnjoqudhdfsyim.supabase.co',
         anonKey: 'sb_publishable_0Qq4Lr52U3NeyDh1a6bWMA_HUsR1Smk'
     };
     ```

---

## 🌐 Cómo Desplegar tu propio Link en Vercel (30 Segundos)

1. Entra a [https://vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **Add New...** ➔ **Project**.
3. Importa tu repositorio `altamarronald05-sketch/taskflow-saas-kanban`.
4. Haz clic en **Deploy**. ¡Tendrás tu propia URL `.vercel.app` en 30 segundos!

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
