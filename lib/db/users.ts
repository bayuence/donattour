import { supabase } from '../supabase'
import type {
  User,
  UserRole,
  UserWithProfile,
  EmployeeProfile,
} from '../types'

// ─── Users ───────────────────────────────────────────────────

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }
  return data ?? []
}

export async function getUsersDetailed(outletId?: string): Promise<UserWithProfile[]> {
  let query = supabase
    .from('users')
    .select(`
      *,
      outlet:outlets(id, nama),
      profile:employee_profiles(*)
    `)
    .order('name')

  if (outletId) {
    query = query.eq('outlet_id', outletId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching detailed users:', JSON.stringify(error, null, 2))
    return []
  }
  return data as any ?? []
}

export async function updateUserAccess(
  userId: string,
  updates: Partial<{ password_hash: string; is_active: boolean; outlet_id: string | null }>
): Promise<boolean> {
  const { error } = await supabase.from('users').update(updates).eq('id', userId)
  if (error) console.error('Error updating user access:', error)
  return !error
}

export async function upsertEmployeeProfile(profile: EmployeeProfile): Promise<boolean> {
  const { error } = await supabase
    .from('employee_profiles')
    .upsert(profile, { onConflict: 'user_id' })

  if (error) console.error('Error upserting employee profile:', error)
  return !error
}

export async function createUser(
  username: string,
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({ email, password_hash: password, name, role, is_active: true, username })
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    return null
  }
  return data
}

export async function loginUser(
  username: string,
  password: string
): Promise<UserWithProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, username, name, email, phone, role, outlet_id, is_active, last_login, created_at,
      profile:employee_profiles(accessible_menus)
    `)
    .eq('username', username)
    .eq('password_hash', password)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Login error:', JSON.stringify(error, null, 2))
    }
    return null
  }

  if (data) {
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id)
  }

  return {
    ...data,
    profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
  } as any as UserWithProfile
}
