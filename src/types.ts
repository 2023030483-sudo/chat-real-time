export type Profile = {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  status: string | null
  created_at?: string
}

export type ConversationSummary = {
  id: string
  type: 'direct' | 'group'
  title: string | null
  avatar_url: string | null
  updated_at: string
  other_user_id: string | null
  other_user_name: string | null
  other_user_username: string | null
  other_user_avatar: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

export type ChatMessage = {
  id: number
  conversation_id: string
  sender_id: string
  body: string
  message_type: 'text' | 'system'
  created_at: string
  updated_at: string
  deleted_at: string | null
  sender?: Profile | null
}
