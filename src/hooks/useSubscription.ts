import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { API_URL } from '@/lib/config'
import type { Subscription, Invoice, PaymentMethod, UsageLimits } from '@/sections/account-billing/types'

/**
 * Hook to manage subscription data via Workers/Express API
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

    // Fetch subscription via Workers/Express API
    const fetchSubscription = async () => {
      try {
        setLoading(true)

        // Get auth session for JWT token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No active session')
        }

        const response = await fetch(`${API_URL}/api/billing/subscription`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch subscription: ${response.statusText}`)
        }

        const result = await response.json()

        if (mounted) {
          setSubscription(result.subscription)
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

    // Set up realtime subscription for live updates
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
        (payload: { new: Record<string, unknown> }) => {
          if (mounted && payload.new) {
            const data = payload.new
            const mappedSubscription = {
              id: data.id as string,
              userId: data.user_id as string,
              plan: data.plan as Subscription['plan'],
              billingCycle: 'monthly' as const,
              status: data.status as Subscription['status'],
              currentPeriodStart: data.current_period_start as string,
              currentPeriodEnd: data.current_period_end as string,
              cancelAtPeriodEnd: (data.cancel_at_period_end as boolean) || false,
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
   * Create or update subscription via Workers/Express API
   */
  const updateSubscription = async (data: Partial<Omit<Subscription, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    // Get auth session for JWT token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    const response = await fetch(`${API_URL}/api/billing/subscription`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to update subscription: ${response.statusText}`)
    }

    const result = await response.json()
    return result.subscription
  }

  return {
    subscription,
    loading,
    error,
    updateSubscription,
  }
}

/**
 * Hook to fetch invoices via Workers/Express API
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

    // Fetch invoices via Workers/Express API
    const fetchInvoices = async () => {
      try {
        setLoading(true)

        // Get auth session for JWT token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No active session')
        }

        const response = await fetch(`${API_URL}/api/billing/invoices`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch invoices: ${response.statusText}`)
        }

        const result = await response.json()

        if (mounted) {
          setInvoices(result.invoices || [])
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

    // Set up realtime subscription for live updates
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
 * Hook to fetch payment methods via Workers/Express API
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

    // Fetch payment methods via Workers/Express API
    const fetchPaymentMethods = async () => {
      try {
        setLoading(true)

        // Get auth session for JWT token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No active session')
        }

        const response = await fetch(`${API_URL}/api/billing/payment-methods`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch payment methods: ${response.statusText}`)
        }

        const result = await response.json()

        if (mounted) {
          setPaymentMethods(result.paymentMethods || [])
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

    // Set up realtime subscription for live updates
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
 * Hook to fetch usage limits via Workers/Express API
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

    // Fetch usage limits via Workers/Express API
    const fetchUsageLimits = async () => {
      try {
        setLoading(true)

        // Get auth session for JWT token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No active session')
        }

        const response = await fetch(`${API_URL}/api/billing/usage-limits`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch usage limits: ${response.statusText}`)
        }

        const result = await response.json()

        if (mounted) {
          setUsageLimits(result.usageLimits)
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

    // Set up realtime subscription for live updates
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
   * Update usage limits via Workers/Express API
   */
  const updateUsageLimits = async (data: Partial<UsageLimits>) => {
    if (!userId) throw new Error('User not authenticated')

    // Get auth session for JWT token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    const response = await fetch(`${API_URL}/api/billing/usage-limits`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to update usage limits: ${response.statusText}`)
    }

    const result = await response.json()
    return result.usageLimits
  }

  return {
    usageLimits,
    loading,
    error,
    updateUsageLimits,
  }
}
