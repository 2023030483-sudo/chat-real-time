# Chat Real Time con Firebase

Aplicación de chat construida con React, TypeScript, Vite y Capacitor. Usa Firebase Authentication para usuarios, Cloud Firestore para perfiles, salas y mensajes en tiempo real, y Cloud Storage para avatares. El mismo código se publica en Netlify y se sincroniza con Android Studio.

## Servicios utilizados

- Firebase Authentication: registro e inicio de sesión con correo y contraseña.
- Cloud Firestore: perfiles, conversaciones privadas, salas grupales, miembros y mensajes.
- Cloud Storage for Firebase: fotografías de perfil.
- Netlify: publicación de la aplicación web.
- Capacitor: empaquetado de la aplicación para Android Studio.

## Configuración rápida

Lee el archivo `CONFIGURAR_FIREBASE_PASO_A_PASO.txt` y realiza los pasos en orden.

Las variables necesarias son:

```env
VITE_FIREBASE_API_KEY=TU_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=TU_PROYECTO.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=TU_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=TU_PROYECTO.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=TU_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=TU_APP_ID
```

## Ejecutar localmente

```powershell
npm install
npm run dev
```

## Publicar cambios en GitHub y Netlify

```powershell
git add .
git commit -m "Migrar backend a Firebase Firestore"
git push origin main
```

En Netlify agrega las seis variables `VITE_FIREBASE_*` y elimina las variables antiguas de Supabase cuando confirmes que Firebase funciona.

## Android Studio

```powershell
npm run android:sync
npm run android:open
```

## Importante sobre los datos anteriores

La aplicación ya no consulta Supabase. Los usuarios, conversaciones y mensajes que existían allí no se copian automáticamente a Firebase. El proyecto de Firebase comienza con datos nuevos.
