const KEY = 'almcont_session'

export const localSessionCache = {
  getSession() {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  saveSupabaseSession(session: unknown) {
    try {
      localStorage.setItem(KEY, JSON.stringify(session))
    } catch {}
  },
  async signOut() {
    try {
      localStorage.removeItem(KEY)
    } catch {}
  },
  async refreshUser() {
    const sess = this.getSession()
    return sess?.user || null
  }
}

