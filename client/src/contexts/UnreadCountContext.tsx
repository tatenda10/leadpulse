import React, { createContext, useContext, useMemo, useState } from 'react'

type UnreadCountContextValue = {
  unreadCount: number
  setUnreadCount: (n: number) => void
}

const UnreadCountContext = createContext<UnreadCountContextValue | undefined>(undefined)

export const UnreadCountProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const value = useMemo(
    () => ({ unreadCount, setUnreadCount }),
    [unreadCount]
  )
  return (
    <UnreadCountContext.Provider value={value}>
      {children}
    </UnreadCountContext.Provider>
  )
}

export function useUnreadCount(): UnreadCountContextValue {
  const context = useContext(UnreadCountContext)
  if (!context) {
    throw new Error('useUnreadCount must be used within UnreadCountProvider')
  }
  return context
}
