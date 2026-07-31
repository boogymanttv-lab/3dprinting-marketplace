import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types'
import type { User } from '@supabase/supabase-js'

const ROLE_RANK: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  operator: 2,
  super_admin: 3,
}

export function hasMinRole(role: UserRole, min: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

/** Server Component / Route Handler helper — resolves current user + their role. */
export async function getCurrentUserAndRole(): Promise<{ user: User | null; role: UserRole }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, role: 'user' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return { user, role: (profile?.role as UserRole) ?? 'user' }
}
