# Chat Real Time

Aplicación de mensajería privada construida con React, TypeScript, Vite, Supabase y Capacitor. El mismo código sirve para navegador, Netlify y Android Studio.

## Funciones incluidas

- Registro e inicio de sesión con correo y contraseña.
- Perfil público con nombre, usuario, estado y foto.
- Búsqueda de usuarios registrados.
- Creación segura de conversaciones privadas sin duplicados.
- Mensajes en tiempo real mediante Supabase Realtime.
- Indicador de mensajes sin leer.
- Diseño adaptable para escritorio y celular.
- Políticas Row Level Security para proteger conversaciones y mensajes.
- Configuración de Netlify, GitHub Actions y Capacitor Android.

## 1. Crear Supabase

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor**.
3. Copia y ejecuta todo el archivo `supabase/migrations/001_initial_schema.sql`.
4. En **Authentication > Providers > Email**, deja activado Email.
5. Para pruebas rápidas puedes desactivar temporalmente la confirmación de correo. Para producción conviene mantenerla activa.
6. En **Project Settings / API** copia la URL del proyecto y la clave publicable.

## 2. Configurar el proyecto local

```bash
npm install
cp .env.example .env.local
npm run dev
```

En Windows PowerShell, en vez de `cp` usa:

```powershell
Copy-Item .env.example .env.local
```

Edita `.env.local`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE
```

Nunca coloques la clave `service_role` en esta aplicación.

## 3. Subir a GitHub

```bash
git init
git add .
git commit -m "Proyecto inicial de chat en tiempo real"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

## 4. Publicar en Netlify

1. En Netlify selecciona **Add new project > Import an existing project**.
2. Conecta el repositorio de GitHub.
3. Netlify detectará `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Agrega estas variables en **Project configuration > Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. En Supabase, agrega la URL de Netlify en **Authentication > URL Configuration** como Site URL y Redirect URL.

## 5. Abrir en Android Studio

Con Android Studio y el SDK de Android instalados:

```bash
npm install
npm run android:add
npm run android:sync
npm run android:open
```

Después de cada cambio web:

```bash
npm run android:sync
```

El comando construye `dist`, copia los archivos a Android y sincroniza los plugins. Desde Android Studio puedes ejecutar la app en emulador o celular y generar el APK/AAB.

## 6. Cambiar nombre e identificador Android

Edita `capacitor.config.ts`:

```ts
appId: 'com.tuempresa.tuapp',
appName: 'Nombre de tu app',
```

Hazlo antes de publicar una versión definitiva en Google Play.

## Diseño de Figma

Los colores, radios, tamaños y espaciados están centralizados en `src/index.css`. Cuando se disponga de las pantallas exportadas de Figma, se reemplazan estas variables y reglas sin cambiar la lógica de Supabase.

## Seguridad

- La aplicación cliente usa únicamente la URL y clave publicable de Supabase.
- RLS controla lectura y escritura en perfiles, conversaciones y mensajes.
- Un usuario solo puede leer conversaciones de las que es miembro.
- Un usuario solo puede enviar mensajes con su propio identificador.
- La función de conversación directa evita chats duplicados entre las mismas dos personas.
- Cada usuario solo puede modificar archivos dentro de su carpeta de avatares.
