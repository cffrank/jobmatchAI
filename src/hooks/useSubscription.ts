import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { doc, setDoc, updateDoc, collection, query, orderBy } from 'firebase/firestore'
import { useDocument, useCollection } from 'react-firebase-hooks/firestore'
import type { Subscription, Invoice, PaymentMethod, UsageLimits } from '@/sections/account-billing/types'

/**
 * Hook to manage subscription data in Firestore
 * Document: users/{userId}/subscription
 */
export function useSubscription() {
  const { user } = useAuth()
  const userId = user?.uid

  // Get reference to subscription document
  const subscriptionRef = userId ? doc(db, 'users', userId, 'subscription') : null

  // Subscribe to subscription document
  const [snapshot, loading, error] = useDocument(subscriptionRef)

  const subscription = snapshot?.exists() ? { id: snapshot.id, ...snapshot.data() } as Subscription : null

  /**
   * Create or update subscription
   */
  const updateSubscription = async (data: Partial<Omit<Subscription, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'subscription')
    await setDoc(ref, data, { merge: true })
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
 * Collection: users/{userId}/invoices
 */
export function useInvoices() {
  const { user } = useAuth()
  const userId = user?.uid

  const invoicesRef = userId
    ? query(collection(db, 'users', userId, 'invoices'), orderBy('date', 'desc'))
    : null

  const [snapshot, loading, error] = useCollection(invoicesRef)

  const invoices: Invoice[] = snapshot
    ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Invoice))
    : []

  return {
    invoices,
    loading,
    error,
  }
}

/**
 * Hook to fetch payment methods
 * Collection: users/{userId}/paymentMethods
 */
export function usePaymentMethods() {
  const { user } = useAuth()
  const userId = user?.uid

  const paymentMethodsRef = userId
    ? query(collection(db, 'users', userId, 'paymentMethods'), orderBy('addedAt', 'desc'))
    : null

  const [snapshot, loading, error] = useCollection(paymentMethodsRef)

  const paymentMethods: PaymentMethod[] = snapshot
    ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PaymentMethod))
    : []

  return {
    paymentMethods,
    loading,
    error,
  }
}

/**
 * Hook to fetch usage limits
 * Document: users/{userId}/usageLimits
 */
export function useUsageLimits() {
  const { user } = useAuth()
  const userId = user?.uid

  const usageLimitsRef = userId ? doc(db, 'users', userId, 'usageLimits') : null

  const [snapshot, loading, error] = useDocument(usageLimitsRef)

  const usageLimits = snapshot?.exists() ? { ...snapshot.data() } as UsageLimits : null

  /**
   * Update usage limits
   */
  const updateUsageLimits = async (data: Partial<UsageLimits>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'usageLimits')
    await setDoc(ref, data, { merge: true })
  }

  return {
    usageLimits,
    loading,
    error,
    updateUsageLimits,
  }
}
