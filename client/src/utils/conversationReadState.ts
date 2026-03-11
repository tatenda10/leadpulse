const READ_STATE_KEY = 'leadpulse_conversation_read_state'

type ReadStateMap = Record<string, number>

function readStateMap(): ReadStateMap {
  try {
    const raw = localStorage.getItem(READ_STATE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ReadStateMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStateMap(state: ReadStateMap): void {
  try {
    localStorage.setItem(READ_STATE_KEY, JSON.stringify(state))
  } catch {
    // ignore storage failures
  }
}

export function markConversationReadLocally(conversationId: string, lastMessageAt: string | null): void {
  const state = readStateMap()
  const parsedTime = lastMessageAt ? new Date(lastMessageAt).getTime() : Number.NaN
  state[conversationId] = Number.isFinite(parsedTime) ? parsedTime : Date.now()
  writeStateMap(state)
}

export function getEffectiveUnreadCount(
  conversationId: string,
  unread: number,
  lastMessageAt: string | null
): number {
  if (unread <= 0) return 0

  const state = readStateMap()
  const readAt = state[conversationId]
  if (!readAt) return unread

  const parsedMessageTime = lastMessageAt ? new Date(lastMessageAt).getTime() : Number.NaN
  if (!Number.isFinite(parsedMessageTime)) return 0

  return readAt >= parsedMessageTime ? 0 : unread
}
