import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Subscription, Invoice, PaymentMethod, UsageLimits } from '@/sections/account-billing/types'

/**
 * Hook to manage subscription data in Supabase
 * Table: subscriptions
 */
export function useSubscription() {
  const { user } = useAuth()
  const userId = user?.id

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let mounted = true

    // Fetch subscription
    const fetchSubscription = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (fetchError) {
          if (fetchError.code !== 'PGRST116') { // Not found is ok
            throw fetchError
          }
        }

        if (mounted) {
          // Map database fields to TypeScript types
          const mappedSubscription = data ? {
            id: data.id,
            userId: data.user_id,
            plan: data.plan,
            billingCycle: data.billing_cycle,
            status: data.status,
            currentPeriodStart: data.current_period_start,
            currentPeriodEnd: data.current_period_end,
            cancelAtPeriodEnd: data.cancel_at_period_end || false,
          } as Subscription : null

          setSubscription(mappedSubscription)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchSubscription()

    // Set up realtime subscription
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (mounted && payload.new) {
            const data = payload.new
            const mappedSubscription = {
              id: data.id,
              userId: data.user_id,
              plan: data.plan,
              billingCycle: data.billing_cycle,
              status: data.status,
              currentPeriodStart: data.current_period_start,
              currentPeriodEnd: data.current_period_end,
              cancelAtPeriodEnd: data.cancel_at_period_end || false,
            } as Subscription
            setSubscription(mappedSubscription)
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      channel.unsubscribe()
    }
  }, [userId])

  /**
   * Create or update subscription
   */
  const updateSubscription = async (data: Partial<Omit<Subscription, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: updateError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        ...data
      })

    if (updateError) throw updateError
  }

  return {
    subscription,
    loading,
    error,
    updateSubscription,
  }
}

/**
 * Hook to fetch invoices
 * Table: invoices
 */
export function useInvoices() {
  const { user } = useAuth()
  const userId = user?.id

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let mounted = true

    // Fetch invoices
    const fetchInvoices = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })

        if (fetchError) throw fetchError

        if (mounted) {
          setInvoices((data as Invoice[]) || [])
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchInvoices()

    // Set up realtime subscription
    const channel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Refetch on any change
          if (mounted) {
            fetchInvoices()
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      channel.unsubscribe()
    }
  }, [userId])

  return {
    invoices,
    loading,
    error,
  }
}

/**
 * Hook to fetch payment methods
 * Table: payment_methods
 */
export function usePaymentMethods() {
  const { user } = useAuth()
  const userId = user?.id

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let mounted = true

    // Fetch payment methods
    const fetchPaymentMethods = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('user_id', userId)
          .order('added_at', { ascending: false })

        if (fetchError) throw fetchError

        if (mounted) {
          setPaymentMethods((data as PaymentMethod[]) || [])
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchPaymentMethods()

    // Set up realtime subscription
    const channel = supabase
      .channel('payment-methods-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_methods',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Refetch on any change
          if (mounted) {
            fetchPaymentMethods()
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      channel.unsubscribe()
    }
  }, [userId])

  return {
    paymentMethods,
    loading,
    error,
  }
}

/**
 * Hook to fetch usage limits
 * Table: usage_limits
 */
export function useUsageLimits() {
  const { user } = useAuth()
  const userId = user?.id

  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let mounted = true

    // Fetch usage limits
    const fetchUsageLimits = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('usage_limits')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (fetchError) {
          if (fetchError.code !== 'PGRST116') { // Not found is ok
            throw fetchError
          }
        }

        if (mounted) {
          setUsageLimits(data as UsageLimits | null)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchUsageLimits()

    // Set up realtime subscription
    const channel = supabase
      .channel('usage-limits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usage_limits',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (mounted) {
            setUsageLimits(payload.new as UsageLimits)
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      channel.unsubscribe()
    }
  }, [userId])

  /**
   * Update usage limits
   */
  const updateUsageLimits = async (data: Partial<UsageLimits>) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: updateError } = await supabase
      .from('usage_limits')
      .upsert({
        user_id: userId,
        ...data
      })

    if (updateError) throw updateError
  }

  return {
    usageLimits,
    loading,
    error,
    updateUsageLimits,
  }
}
