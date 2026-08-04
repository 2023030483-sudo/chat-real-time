import { getFirebaseServices } from './firebase'
import type {
  AuthUser,
  ChatMessage,
  ConversationSummary,
  GroupRoom,
  Profile,
  RoomDetails,
  RoomMember,
  RoomVisibility,
} from '../types'

type Unsubscribe = () => void

type FirestoreConversation = {
  type: 'direct' | 'group'
  title?: string | null
  description?: string | null
  category?: string | null
  visibility?: RoomVisibility | null
  avatar_url?: string | null
  created_by: string
  creator_name?: string | null
  creator_avatar?: string | null
  member_ids: string[]
  direct_key?: string | null
  created_at?: any
  updated_at?: any
  last_message?: string | null
  last_message_at?: any
}

const ROOM_VISIBILITY_MIGRATION_ID = 'room-visibility-v1'
const ROOM_INVITE_CODE_LENGTH = 8
const ROOM_INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const defaultRooms = [
  {
    id: 'default-general',
    title: 'General',
    description: 'Espacio para consultas generales sobre la materia y el aula.',
    category: 'Académicas',
  },
  {
    id: 'default-tareas',
    title: 'Tareas',
    description: 'Comparte evidencias, dudas y recordatorios de tareas.',
    category: 'Académicas',
  },
  {
    id: 'default-proyecto-final',
    title: 'Proyecto final',
    description: 'Organiza avances, entregas y acuerdos del proyecto final.',
    category: 'Social',
  },
  {
    id: 'default-avisos',
    title: 'Avisos',
    description: 'Comunicados importantes para todos los estudiantes.',
    category: 'Urgente',
  },
]

function toIso(value: any): string {
  if (value?.toDate) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  if (typeof value === 'number') return new Date(value).toISOString()
  return new Date().toISOString()
}

function asProfile(id: string, data: any): Profile {
  return {
    id,
    username: String(data?.username ?? `user_${id.slice(0, 8)}`),
    full_name: String(data?.full_name ?? data?.username ?? 'Usuario'),
    avatar_url: data?.avatar_url ? String(data.avatar_url) : null,
    status: data?.status ? String(data.status) : null,
    created_at: data?.created_at ? toIso(data.created_at) : undefined,
  }
}

function firebaseErrorMessage(caught: unknown): string {
  const code = typeof caught === 'object' && caught && 'code' in caught
    ? String((caught as { code?: unknown }).code)
    : ''

  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Ese correo ya está registrado.',
    'auth/invalid-credential': 'El correo o la contraseña son incorrectos.',
    'auth/invalid-email': 'El correo electrónico no es válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Se realizaron demasiados intentos. Intenta más tarde.',
    'auth/network-request-failed': 'No fue posible conectar con Firebase.',
    'permission-denied': 'Firebase rechazó la operación. Revisa las reglas de seguridad.',
  }

  if (messages[code]) return messages[code]
  return caught instanceof Error ? caught.message : 'Ocurrió un error inesperado.'
}

export async function signInFirebase(email: string, password: string): Promise<void> {
  try {
    const { auth, authApi } = await getFirebaseServices()
    await authApi.signInWithEmailAndPassword(auth, email, password)
  } catch (caught) {
    throw new Error(firebaseErrorMessage(caught))
  }
}

export async function createFirebaseAccount(input: {
  email: string
  password: string
  fullName: string
  username: string
}): Promise<void> {
  const normalizedUsername = input.username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '')
  if (normalizedUsername.length < 3) {
    throw new Error('El nombre de usuario debe tener al menos 3 caracteres válidos.')
  }

  const { auth, db, authApi, firestoreApi } = await getFirebaseServices()
  let createdUser: any = null

  try {
    const credential = await authApi.createUserWithEmailAndPassword(auth, input.email, input.password)
    createdUser = credential.user
    const profileRef = firestoreApi.doc(db, 'profiles', createdUser.uid)
    const usernameRef = firestoreApi.doc(db, 'usernames', normalizedUsername)

    await firestoreApi.runTransaction(db, async (transaction: any) => {
      const usernameSnapshot = await transaction.get(usernameRef)
      if (usernameSnapshot.exists()) {
        throw new Error('Ese nombre de usuario ya está ocupado.')
      }

      const now = firestoreApi.serverTimestamp()
      transaction.set(usernameRef, {
        owner_id: createdUser.uid,
        created_at: now,
      })
      transaction.set(profileRef, {
        id: createdUser.uid,
        username: normalizedUsername,
        username_lower: normalizedUsername,
        full_name: input.fullName.trim(),
        full_name_lower: input.fullName.trim().toLowerCase(),
        avatar_url: null,
        status: null,
        created_at: now,
        updated_at: now,
      })
    })
  } catch (caught) {
    if (createdUser) {
      await authApi.deleteUser(createdUser).catch(() => undefined)
    }
    throw new Error(firebaseErrorMessage(caught))
  }
}

export async function subscribeAuth(
  onUser: (user: AuthUser | null) => void,
  onError: (error: Error) => void,
): Promise<Unsubscribe> {
  const { auth, authApi } = await getFirebaseServices()
  return authApi.onAuthStateChanged(
    auth,
    (user: any) => {
      onUser(user ? { id: user.uid, uid: user.uid, email: user.email ?? null } : null)
    },
    (caught: unknown) => onError(new Error(firebaseErrorMessage(caught))),
  )
}

export async function signOutFirebase(): Promise<void> {
  const { auth, authApi } = await getFirebaseServices()
  await authApi.signOut(auth)
}

export async function getProfile(userId: string, email?: string | null): Promise<Profile> {
  const { db, firestoreApi } = await getFirebaseServices()
  const profileRef = firestoreApi.doc(db, 'profiles', userId)
  const snapshot = await firestoreApi.getDoc(profileRef)

  if (snapshot.exists()) return asProfile(snapshot.id, snapshot.data())

  const fallbackName = email?.split('@')[0] || `Usuario ${userId.slice(0, 5)}`
  const fallbackUsername = `user_${userId.slice(0, 8).toLowerCase()}`

  return {
    id: userId,
    username: fallbackUsername,
    full_name: fallbackName,
    avatar_url: null,
    status: null,
  }
}

export async function updateProfile(profileId: string, changes: {
  full_name?: string
  status?: string | null
  avatar_url?: string | null
}): Promise<void> {
  const { db, firestoreApi } = await getFirebaseServices()
  const payload: Record<string, unknown> = {
    ...changes,
    updated_at: firestoreApi.serverTimestamp(),
  }
  if (changes.full_name !== undefined) payload.full_name_lower = changes.full_name.toLowerCase()
  await firestoreApi.setDoc(firestoreApi.doc(db, 'profiles', profileId), payload, { merge: true })
}

export async function uploadAvatar(profileId: string, file: File): Promise<string> {
  const { storage, storageApi } = await getFirebaseServices()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileRef = storageApi.ref(storage, `avatars/${profileId}/avatar-${Date.now()}.${extension}`)
  await storageApi.uploadBytes(fileRef, file, { contentType: file.type })
  return storageApi.getDownloadURL(fileRef)
}

export async function subscribeProfiles(
  currentUserId: string,
  onData: (profiles: Profile[]) => void,
  onError: (error: Error) => void,
): Promise<Unsubscribe> {
  const { db, firestoreApi } = await getFirebaseServices()
  const profileQuery = firestoreApi.query(
    firestoreApi.collection(db, 'profiles'),
    firestoreApi.orderBy('full_name_lower'),
    firestoreApi.limit(100),
  )

  return firestoreApi.onSnapshot(
    profileQuery,
    (snapshot: any) => {
      const profiles = snapshot.docs
        .filter((item: any) => item.id !== currentUserId)
        .map((item: any) => asProfile(item.id, item.data()))
      onData(profiles)
    },
    (caught: unknown) => onError(new Error(firebaseErrorMessage(caught))),
  )
}

async function unreadCount(conversationId: string, userId: string): Promise<number> {
  const { db, firestoreApi } = await getFirebaseServices()
  const memberSnapshot = await firestoreApi.getDoc(
    firestoreApi.doc(db, 'conversations', conversationId, 'members', userId),
  )
  const lastRead = memberSnapshot.data()?.last_read_at
  if (!lastRead) return 0

  const messageQuery = firestoreApi.query(
    firestoreApi.collection(db, 'conversations', conversationId, 'messages'),
    firestoreApi.where('created_at', '>', lastRead),
  )
  const messages = await firestoreApi.getDocs(messageQuery)
  return messages.docs.filter((item: any) => item.data().sender_id !== userId).length
}

async function conversationSummary(
  conversationId: string,
  data: FirestoreConversation,
  userId: string,
): Promise<ConversationSummary> {
  let otherProfile: Profile | null = null
  if (data.type === 'direct') {
    const otherId = data.member_ids.find((id) => id !== userId)
    if (otherId) otherProfile = await getProfile(otherId)
  }

  return {
    id: conversationId,
    type: data.type,
    title: data.title ?? null,
    avatar_url: data.avatar_url ?? null,
    updated_at: toIso(data.updated_at ?? data.created_at),
    other_user_id: otherProfile?.id ?? null,
    other_user_name: otherProfile?.full_name ?? null,
    other_user_username: otherProfile?.username ?? null,
    other_user_avatar: otherProfile?.avatar_url ?? null,
    last_message: data.last_message ?? null,
    last_message_at: data.last_message_at ? toIso(data.last_message_at) : null,
    unread_count: await unreadCount(conversationId, userId).catch(() => 0),
  }
}

export async function subscribeMyConversations(
  userId: string,
  onData: (conversations: ConversationSummary[]) => void,
  onError: (error: Error) => void,
): Promise<Unsubscribe> {
  const { db, firestoreApi } = await getFirebaseServices()
  const conversationsQuery = firestoreApi.query(
    firestoreApi.collection(db, 'conversations'),
    firestoreApi.where('member_ids', 'array-contains', userId),
  )
  let generation = 0

  return firestoreApi.onSnapshot(
    conversationsQuery,
    (snapshot: any) => {
      const currentGeneration = ++generation
      void Promise.all(snapshot.docs.map((item: any) => (
        conversationSummary(item.id, item.data() as FirestoreConversation, userId)
      ))).then((rows) => {
        if (currentGeneration !== generation) return
        rows.sort((a, b) => {
          const aDate = new Date(a.last_message_at ?? a.updated_at).getTime()
          const bDate = new Date(b.last_message_at ?? b.updated_at).getTime()
          return bDate - aDate
        })
        onData(rows)
      }).catch((caught) => onError(new Error(firebaseErrorMessage(caught))))
    },
    (caught: unknown) => onError(new Error(firebaseErrorMessage(caught))),
  )
}

export async function createDirectConversation(currentProfile: Profile, otherProfile: Profile): Promise<string> {
  const { db, firestoreApi } = await getFirebaseServices()
  const memberIds = [currentProfile.id, otherProfile.id].sort()
  const conversationId = memberIds.join('__')
  const conversationRef = firestoreApi.doc(db, 'conversations', conversationId)
  const snapshot = await firestoreApi.getDoc(conversationRef)

  if (!snapshot.exists()) {
    const now = firestoreApi.serverTimestamp()
    await firestoreApi.setDoc(conversationRef, {
      type: 'direct',
      title: null,
      description: null,
      category: null,
      avatar_url: null,
      direct_key: conversationId,
      created_by: currentProfile.id,
      creator_name: currentProfile.full_name,
      creator_avatar: currentProfile.avatar_url,
      member_ids: memberIds,
      created_at: now,
      updated_at: now,
      last_message: null,
      last_message_at: null,
    })
  }

  const now = firestoreApi.serverTimestamp()
  await Promise.all([
    firestoreApi.setDoc(
      firestoreApi.doc(db, 'conversations', conversationId, 'members', currentProfile.id),
      {
        user_id: currentProfile.id,
        role: 'owner',
        joined_at: now,
        last_read_at: now,
        profile: currentProfile,
      },
      { merge: true },
    ),
    firestoreApi.setDoc(
      firestoreApi.doc(db, 'conversations', conversationId, 'members', otherProfile.id),
      {
        user_id: otherProfile.id,
        role: 'member',
        joined_at: now,
        last_read_at: now,
        profile: otherProfile,
      },
      { merge: true },
    ),
  ])

  return conversationId
}

function roomVisibility(data: FirestoreConversation): RoomVisibility {
  return data.visibility === 'private' ? 'private' : 'public'
}

function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function generateInviteCode(): string {
  const values = new Uint32Array(ROOM_INVITE_CODE_LENGTH)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values)
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * 0xffffffff)
    }
  }

  return Array.from(values, (value) => (
    ROOM_INVITE_ALPHABET[value % ROOM_INVITE_ALPHABET.length]
  )).join('')
}

async function migrateLegacyRoomsToPublic(): Promise<void> {
  const { db, firestoreApi } = await getFirebaseServices()
  const migrationRef = firestoreApi.doc(db, 'migrations', ROOM_VISIBILITY_MIGRATION_ID)
  const migrationSnapshot = await firestoreApi.getDoc(migrationRef)
  if (migrationSnapshot.exists()) return

  const legacyQuery = firestoreApi.query(
    firestoreApi.collection(db, 'conversations'),
    firestoreApi.where('type', '==', 'group'),
  )
  const snapshot = await firestoreApi.getDocs(legacyQuery)
  const pending = snapshot.docs.filter((item: any) => {
    const data = item.data() as FirestoreConversation
    return data.visibility !== 'public' && data.visibility !== 'private'
  })

  for (let offset = 0; offset < pending.length; offset += 400) {
    const batch = firestoreApi.writeBatch(db)
    pending.slice(offset, offset + 400).forEach((item: any) => {
      batch.update(item.ref, { visibility: 'public' })
    })
    await batch.commit()
  }

  await firestoreApi.setDoc(migrationRef, {
    id: ROOM_VISIBILITY_MIGRATION_ID,
    completed_at: firestoreApi.serverTimestamp(),
  })
}

export async function ensureDefaultRooms(profile: Profile): Promise<void> {
  const { db, firestoreApi } = await getFirebaseServices()
  await migrateLegacyRoomsToPublic()

  for (const room of defaultRooms) {
    const roomRef = firestoreApi.doc(db, 'conversations', room.id)
    const created = await firestoreApi.runTransaction(db, async (transaction: any) => {
      const snapshot = await transaction.get(roomRef)
      if (snapshot.exists()) return false

      const now = firestoreApi.serverTimestamp()
      transaction.set(roomRef, {
        type: 'group',
        title: room.title,
        description: room.description,
        category: room.category,
        visibility: 'public',
        avatar_url: null,
        direct_key: null,
        is_default: true,
        created_by: profile.id,
        creator_name: profile.full_name,
        creator_avatar: profile.avatar_url,
        member_ids: [profile.id],
        created_at: now,
        updated_at: now,
        last_message: null,
        last_message_at: null,
      })
      return true
    })

    if (!created) continue
    const now = firestoreApi.serverTimestamp()
    await firestoreApi.setDoc(
      firestoreApi.doc(db, 'conversations', room.id, 'members', profile.id),
      {
        user_id: profile.id,
        role: 'owner',
        joined_at: now,
        last_read_at: now,
        invite_code: null,
        profile,
      },
    )
  }
}

async function groupRoomFromDocument(
  item: any,
  userId: string,
): Promise<GroupRoom> {
  const data = item.data() as FirestoreConversation
  const isMember = data.member_ids.includes(userId)

  return {
    id: item.id,
    title: data.title ?? 'Sala',
    description: data.description ?? null,
    category: data.category ?? 'Académicas',
    visibility: roomVisibility(data),
    avatar_url: data.avatar_url ?? null,
    created_at: toIso(data.created_at),
    updated_at: toIso(data.updated_at ?? data.created_at),
    creator_id: data.created_by,
    creator_name: data.creator_name ?? 'Administrador',
    creator_avatar: data.creator_avatar ?? null,
    is_member: isMember,
    member_count: data.member_ids.length,
    last_message: data.last_message ?? null,
    last_message_at: data.last_message_at ? toIso(data.last_message_at) : null,
    unread_count: isMember ? await unreadCount(item.id, userId).catch(() => 0) : 0,
  }
}

export async function subscribeGroupRooms(
  userId: string,
  onData: (rooms: GroupRoom[]) => void,
  onError: (error: Error) => void,
): Promise<Unsubscribe> {
  const { db, firestoreApi } = await getFirebaseServices()
  const conversations = firestoreApi.collection(db, 'conversations')
  const publicRoomsQuery = firestoreApi.query(
    conversations,
    firestoreApi.where('type', '==', 'group'),
    firestoreApi.where('visibility', '==', 'public'),
  )
  const myRoomsQuery = firestoreApi.query(
    conversations,
    firestoreApi.where('member_ids', 'array-contains', userId),
  )

  let publicDocuments: any[] = []
  let memberDocuments: any[] = []
  let publicReady = false
  let memberReady = false
  let generation = 0

  const emit = () => {
    if (!publicReady || !memberReady) return
    const currentGeneration = ++generation
    const merged = new Map<string, any>()

    publicDocuments.forEach((item) => {
      const data = item.data() as FirestoreConversation
      if (data.type === 'group') merged.set(item.id, item)
    })
    memberDocuments.forEach((item) => {
      const data = item.data() as FirestoreConversation
      if (data.type === 'group') merged.set(item.id, item)
    })

    void Promise.all(
      Array.from(merged.values()).map((item) => groupRoomFromDocument(item, userId)),
    ).then((rooms) => {
      if (currentGeneration !== generation) return
      rooms.sort((a, b) => {
        const aDate = new Date(a.last_message_at ?? a.updated_at).getTime()
        const bDate = new Date(b.last_message_at ?? b.updated_at).getTime()
        return bDate - aDate
      })
      onData(rooms)
    }).catch((caught) => onError(new Error(firebaseErrorMessage(caught))))
  }

  const unsubscribePublic = firestoreApi.onSnapshot(
    publicRoomsQuery,
    (snapshot: any) => {
      publicDocuments = snapshot.docs
      publicReady = true
      emit()
    },
    (caught: unknown) => onError(new Error(firebaseErrorMessage(caught))),
  )

  const unsubscribeMine = firestoreApi.onSnapshot(
    myRoomsQuery,
    (snapshot: any) => {
      memberDocuments = snapshot.docs
      memberReady = true
      emit()
    },
    (caught: unknown) => onError(new Error(firebaseErrorMessage(caught))),
  )

  return () => {
    unsubscribePublic()
    unsubscribeMine()
  }
}

export async function joinGroupRoom(
  roomId: string,
  profile: Profile,
  inviteCode?: string,
): Promise<void> {
  const { db, firestoreApi } = await getFirebaseServices()
  const now = firestoreApi.serverTimestamp()
  const normalizedCode = inviteCode ? normalizeInviteCode(inviteCode) : null
  const batch = firestoreApi.writeBatch(db)

  batch.update(firestoreApi.doc(db, 'conversations', roomId), {
    member_ids: firestoreApi.arrayUnion(profile.id),
    updated_at: now,
  })
  batch.set(
    firestoreApi.doc(db, 'conversations', roomId, 'members', profile.id),
    {
      user_id: profile.id,
      role: 'member',
      joined_at: now,
      last_read_at: now,
      invite_code: normalizedCode,
      profile,
    },
    { merge: true },
  )
  await batch.commit()
}

export async function joinPrivateRoomByCode(
  code: string,
  profile: Profile,
): Promise<string> {
  const normalizedCode = normalizeInviteCode(code)
  if (normalizedCode.length !== ROOM_INVITE_CODE_LENGTH) {
    throw new Error(`El código debe tener ${ROOM_INVITE_CODE_LENGTH} caracteres.`)
  }

  const { db, firestoreApi } = await getFirebaseServices()
  const inviteSnapshot = await firestoreApi.getDoc(
    firestoreApi.doc(db, 'room_invites', normalizedCode),
  )

  if (!inviteSnapshot.exists()) {
    throw new Error('El código no existe o ya no es válido.')
  }

  const invite = inviteSnapshot.data()
  const roomId = String(invite?.room_id ?? '')
  if (!roomId) throw new Error('El código de invitación no es válido.')

  await joinGroupRoom(roomId, profile, normalizedCode)
  return roomId
}

export async function createGroupConversation(
  profile: Profile,
  title: string,
  description: string,
  category: string,
  visibility: RoomVisibility,
): Promise<{ roomId: string; joinCode: string | null }> {
  const { db, firestoreApi } = await getFirebaseServices()
  const conversationRef = firestoreApi.doc(firestoreApi.collection(db, 'conversations'))

  const conversationData = (now: any) => ({
    type: 'group',
    title,
    description: description || null,
    category,
    visibility,
    avatar_url: null,
    direct_key: null,
    created_by: profile.id,
    creator_name: profile.full_name,
    creator_avatar: profile.avatar_url,
    member_ids: [profile.id],
    created_at: now,
    updated_at: now,
    last_message: null,
    last_message_at: null,
  })

  const ownerData = (now: any) => ({
    user_id: profile.id,
    role: 'owner',
    joined_at: now,
    last_read_at: now,
    invite_code: null,
    profile,
  })

  if (visibility === 'public') {
    const now = firestoreApi.serverTimestamp()
    const batch = firestoreApi.writeBatch(db)
    batch.set(conversationRef, conversationData(now))
    batch.set(
      firestoreApi.doc(db, 'conversations', conversationRef.id, 'members', profile.id),
      ownerData(now),
    )
    await batch.commit()
    return { roomId: conversationRef.id, joinCode: null }
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const joinCode = generateInviteCode()
    const inviteRef = firestoreApi.doc(db, 'room_invites', joinCode)

    try {
      await firestoreApi.runTransaction(db, async (transaction: any) => {
        const inviteSnapshot = await transaction.get(inviteRef)
        if (inviteSnapshot.exists()) throw new Error('room-code-collision')

        const now = firestoreApi.serverTimestamp()
        transaction.set(conversationRef, conversationData(now))
        transaction.set(
          firestoreApi.doc(db, 'conversations', conversationRef.id, 'members', profile.id),
          ownerData(now),
        )
        transaction.set(inviteRef, {
          room_id: conversationRef.id,
          created_by: profile.id,
          created_at: now,
          active: true,
        })
      })

      return { roomId: conversationRef.id, joinCode }
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'room-code-collision') continue
      throw new Error(firebaseErrorMessage(caught))
    }
  }

  throw new Error('No fue posible generar un código único. Intenta nuevamente.')
}

export async function subscribeMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): Promise<Unsubscribe> {
  const { db, firestoreApi } = await getFirebaseServices()
  const messagesQuery = firestoreApi.query(
    firestoreApi.collection(db, 'conversations', conversationId, 'messages'),
    firestoreApi.orderBy('created_at', 'desc'),
    firestoreApi.limit(500),
  )

  return firestoreApi.onSnapshot(
    messagesQuery,
    (snapshot: any) => {
      const messages = snapshot.docs.map((item: any) => {
        const data = item.data()
        return {
          id: item.id,
          conversation_id: conversationId,
          sender_id: String(data.sender_id),
          body: String(data.body ?? ''),
          message_type: data.message_type === 'system' ? 'system' : 'text',
          created_at: toIso(data.created_at),
          updated_at: toIso(data.updated_at ?? data.created_at),
          deleted_at: data.deleted_at ? toIso(data.deleted_at) : null,
          sender: {
            id: String(data.sender_id),
            username: String(data.sender_username ?? 'usuario'),
            full_name: String(data.sender_name ?? 'Usuario'),
            avatar_url: data.sender_avatar ? String(data.sender_avatar) : null,
            status: null,
          },
        } satisfies ChatMessage
      }).reverse()
      onData(messages)
    },
    (caught: unknown) => onError(new Error(firebaseErrorMessage(caught))),
  )
}

export async function sendMessage(
  conversationId: string,
  sender: Profile,
  body: string,
): Promise<void> {
  const { db, firestoreApi } = await getFirebaseServices()
  const messageRef = firestoreApi.doc(
    firestoreApi.collection(db, 'conversations', conversationId, 'messages'),
  )
  const now = firestoreApi.serverTimestamp()
  const batch = firestoreApi.writeBatch(db)
  batch.set(messageRef, {
    conversation_id: conversationId,
    sender_id: sender.id,
    sender_name: sender.full_name,
    sender_username: sender.username,
    sender_avatar: sender.avatar_url,
    body,
    message_type: 'text',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  })
  batch.update(firestoreApi.doc(db, 'conversations', conversationId), {
    last_message: body,
    last_message_at: now,
    updated_at: now,
  })
  await batch.commit()
}

export async function markConversationRead(conversationId: string, profile: Profile): Promise<void> {
  const { db, firestoreApi } = await getFirebaseServices()
  await firestoreApi.setDoc(
    firestoreApi.doc(db, 'conversations', conversationId, 'members', profile.id),
    {
      user_id: profile.id,
      last_read_at: firestoreApi.serverTimestamp(),
      profile,
    },
    { merge: true },
  )
}

export async function subscribeMembers(
  conversationId: string,
  onData: (members: RoomMember[]) => void,
  onError: (error: Error) => void,
): Promise<Unsubscribe> {
  const { db, firestoreApi } = await getFirebaseServices()
  const membersQuery = firestoreApi.query(
    firestoreApi.collection(db, 'conversations', conversationId, 'members'),
    firestoreApi.orderBy('joined_at'),
  )

  return firestoreApi.onSnapshot(
    membersQuery,
    (snapshot: any) => {
      onData(snapshot.docs.map((item: any) => {
        const data = item.data()
        return {
          user_id: item.id,
          role: data.role === 'owner' || data.role === 'admin' ? data.role : 'member',
          joined_at: toIso(data.joined_at),
          profile: data.profile ? asProfile(item.id, data.profile) : null,
        } satisfies RoomMember
      }))
    },
    (caught: unknown) => onError(new Error(firebaseErrorMessage(caught))),
  )
}

export async function getRoomDetails(roomId: string): Promise<RoomDetails> {
  const { db, firestoreApi } = await getFirebaseServices()
  const roomSnapshot = await firestoreApi.getDoc(firestoreApi.doc(db, 'conversations', roomId))
  if (!roomSnapshot.exists()) throw new Error('No fue posible encontrar la información de esta sala.')
  const data = roomSnapshot.data() as FirestoreConversation
  const countSnapshot = await firestoreApi.getCountFromServer(
    firestoreApi.collection(db, 'conversations', roomId, 'messages'),
  )

  return {
    id: roomId,
    title: data.title ?? 'Sala',
    description: data.description ?? null,
    category: data.category ?? 'Académicas',
    visibility: roomVisibility(data),
    avatar_url: data.avatar_url ?? null,
    created_at: toIso(data.created_at),
    creator_id: data.created_by,
    creator_name: data.creator_name ?? 'Administrador',
    creator_avatar: data.creator_avatar ?? null,
    member_count: data.member_ids.length,
    message_count: Number(countSnapshot.data().count ?? 0),
  }
}