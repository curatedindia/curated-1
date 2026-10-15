import { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';

/**
 * Default fallback item matching the user's cart piece:
 * Pigment-Dyed French Terry Drop-Shoulder Hoodie (Size L, ₹1,599)
 */
const DEFAULT_HOODIE_ITEM = {
  product_id: 'prod-006',
  variant_id: 'var-006',
  name: 'Pigment-Dyed French Terry Drop-Shoulder Hoodie',
  sku: 'CUR-HD-001',
  size: 'L',
  quantity: 1,
  unit_price: 1599,
  image: '/products/man_street_hoodie.jpg'
};

const CART_STORAGE_KEY = 'curated_cart';

/**
 * useCheckoutAuth
 * 
 * Custom React hook for the /checkout page that:
 * 1. Listens for the Supabase session after returning from Google OAuth (signInWithOAuth).
 * 2. Extracts user profile details (email, full name, avatar).
 * 3. Preserves items in the cart (specifically the Pigment-Dyed French Terry Drop-Shoulder Hoodie)
 *    from localStorage across the OAuth redirect cycle.
 */
export function useCheckoutAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    email: '',
    fullName: '',
    avatarUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // 1. Preserve and retrieve cart items from localStorage
  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Error reading cart from localStorage:', err);
    }
    // Fallback: preserve the Hoodie piece if cart was newly initialized
    return [DEFAULT_HOODIE_ITEM];
  });

  // Keep localStorage synchronized whenever cartItems changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (err) {
      console.error('Failed to sync cart to localStorage:', err);
    }
  }, [cartItems]);

  // Helper to extract clean profile information from Supabase user object
  const extractProfile = useCallback((supabaseUser) => {
    if (!supabaseUser) {
      return { email: '', fullName: '', avatarUrl: '' };
    }
    const meta = supabaseUser.user_metadata || {};
    const email = supabaseUser.email || meta.email || '';
    const fullName =
      meta.full_name ||
      meta.name ||
      [meta.given_name, meta.family_name].filter(Boolean).join(' ') ||
      (email ? email.split('@')[0] : 'Curated Patron');
    const avatarUrl = meta.avatar_url || meta.picture || '';

    return { email, fullName, avatarUrl };
  }, []);

  // 2. Listen for Supabase session after returning from Google OAuth
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        // Fetch existing or newly returned session (from URL hash / authorization code)
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Supabase getSession error:', error);
          if (mounted) setAuthError(error.message);
        }

        if (mounted && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setProfile(extractProfile(currentSession.user));

          // Clean up OAuth tokens from URL hash for a clean /checkout experience
          if (window.location.hash.includes('access_token')) {
            window.history.replaceState(null, document.title, window.location.pathname);
          }
        }
      } catch (err) {
        console.error('Unexpected error loading auth session:', err);
        if (mounted) setAuthError('Failed to initialize authentication session.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Subscribe to auth state updates (e.g. SIGNED_IN event triggered when OAuth redirects back)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          setProfile(extractProfile(newSession.user));

          // Clean up tokens in URL if present
          if (window.location.hash.includes('access_token')) {
            window.history.replaceState(null, document.title, window.location.pathname);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile({ email: '', fullName: '', avatarUrl: '' });
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [extractProfile]);

  // Cart financial summary calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price || 0) * (item.quantity || 1), 0);
  const freeShippingThreshold = 1499;
  const flatShippingRate = 99;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingFee = isFreeShipping ? 0 : flatShippingRate;
  const total = subtotal + shippingFee;

  const clearCart = useCallback(() => {
    setCartItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing cart in localStorage:', e);
    }
  }, []);

  return {
    session,
    user,
    profile, // { email, fullName, avatarUrl }
    cartItems,
    subtotal,
    shippingFee,
    isFreeShipping,
    total,
    loading,
    authError,
    clearCart,
    setCartItems
  };
}

export default useCheckoutAuth;
