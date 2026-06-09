import { supabase } from '../supabase'
import type { PaymentMethodConfig } from '../types'

export async function getPaymentMethods(): Promise<PaymentMethodConfig[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching payment methods:', error)
    return []
  }
  return data ?? []
}

export async function upsertPaymentMethod(data: Partial<PaymentMethodConfig> & { name: string, type: string }): Promise<PaymentMethodConfig | null> {
  const { data: result, error } = await supabase
    .from('payment_methods')
    .upsert({ ...data, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) {
    console.error('Error upserting payment method:', error)
    return null
  }
  return result
}

export async function deletePaymentMethod(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('payment_methods')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting payment method:', error)
    return false
  }
  return true
}

export async function getPaymentTypes(): Promise<{id: string, name: string}[]> {
  const { data, error } = await supabase
    .from('payment_types')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching payment types:', error)
    return []
  }
  return data ?? []
}

export async function addPaymentType(name: string): Promise<boolean> {
  const { error } = await supabase
    .from('payment_types')
    .insert([{ name }])

  if (error) {
    console.error('Error adding payment type:', error)
    return false
  }
  return true
}

export async function deletePaymentType(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('payment_types')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting payment type:', error)
    return false
  }
  return true
}
