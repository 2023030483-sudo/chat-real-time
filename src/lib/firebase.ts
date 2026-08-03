const FIREBASE_SDK_VERSION = '12.17.0'

type FirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId?: string
  appId: string
}

type FirebaseServices = {
  app: any
  auth: any
  db: any
  storage: any
  authApi: any
  firestoreApi: any
  storageApi: any
}

const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}

const missingVariables = [
  ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
  ['VITE_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket],
  ['VITE_FIREBASE_APP_ID', firebaseConfig.appId],
]
  .filter(([, value]) => !value)
  .map(([name]) => name)

let servicesPromise: Promise<FirebaseServices> | null = null

function loadRemoteModule(fileName: string): Promise<any> {
  const url = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/${fileName}`
  return import(/* @vite-ignore */ url)
}

export function getFirebaseServices(): Promise<FirebaseServices> {
  if (missingVariables.length > 0) {
    return Promise.reject(
      new Error(`Faltan variables de Firebase: ${missingVariables.join(', ')}.`),
    )
  }

  if (!servicesPromise) {
    servicesPromise = Promise.all([
      loadRemoteModule('firebase-app.js'),
      loadRemoteModule('firebase-auth.js'),
      loadRemoteModule('firebase-firestore.js'),
      loadRemoteModule('firebase-storage.js'),
    ]).then(([appApi, authApi, firestoreApi, storageApi]) => {
      const app = appApi.getApps().length > 0
        ? appApi.getApp()
        : appApi.initializeApp(firebaseConfig)
      const auth = authApi.getAuth(app)
      const db = firestoreApi.getFirestore(app)
      const storage = storageApi.getStorage(app)

      void authApi.setPersistence(auth, authApi.browserLocalPersistence).catch(() => {
        // Firebase conserva la sesión con el mecanismo disponible en el dispositivo.
      })

      return { app, auth, db, storage, authApi, firestoreApi, storageApi }
    })
  }

  return servicesPromise
}
