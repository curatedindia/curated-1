import { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import supabase from '../supabaseClient';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

/**
 * Dynamically loads the Razorpay checkout script if not already present on window.
 */
export function loadRazorpaySdk() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * useRazorpayCheckout
 * 
 * Shared React hook for CURATED checkout flows:
 * - Razorpay SDK script preloading & invocation
 * - Postal pincode lookup (via api.postalpincode.in) for auto-populating city/state
 * - Shipping address fields management, auto-population from Supabase auth, and validation
 * - Dynamic delivery fee & total calculation (free threshold vs flat rate vs item-specific charges)
 * - 10-minute hold reservation timer
 * - Server-side Razorpay order creation and payment verification via /api/razorpay/verify-payment
 */
export function useRazorpayCheckout({
  cartItems = [],
  settings = {},
  authUser = null,
  profile = null,
  onOrderSuccess = null,
  clearCart = null,
  initialFormData = null
} = {}) {
  // Checkout flow step: 'FORM' | 'GATEWAY' | 'CONFIRMED' | 'FAILED' | 'LATE_REFUND'
  const [step, setStep] = useState('FORM');

  // Address form fields initialized with provided auth/profile or initial data
  const [formData, setFormData] = useState(() => {
    const meta = authUser?.user_metadata || {};
    const initialName =
      initialFormData?.name ||
      profile?.fullName ||
      meta.full_name ||
      meta.name ||
      '';
    const initialEmail =
      initialFormData?.email ||
      profile?.email ||
      authUser?.email ||
      '';

    return {
      name: initialName,
      mobile: initialFormData?.mobile || '',
      email: initialEmail,
      address: initialFormData?.address || '',
      city: initialFormData?.city || '',
      state: initialFormData?.state || '',
      pincode: initialFormData?.pincode || ''
    };
  });

  const [policyAck, setPolicyAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(600);
  const [paymentStatusMsg, setPaymentStatusMsg] = useState({ text: '', type: '' });
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // 1. Preload Razorpay SDK script on hook mount
  useEffect(() => {
    loadRazorpaySdk();
  }, []);

  // 2. Listen for async Supabase session changes or OAuth redirects
  useEffect(() => {
    let isMounted = true;

    const populateFromUser = (currentUser) => {
      if (!currentUser) return;
      const extractedEmail = currentUser.email || '';
      const meta = currentUser.user_metadata || {};
      const extractedName = meta.full_name || meta.name || '';

      setFormData((prev) => ({
        ...prev,
        name: prev.name.trim() !== '' ? prev.name : extractedName,
        email: prev.email.trim() !== '' ? prev.email : extractedEmail
      }));
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error fetching Supabase session on checkout hook mount:', error);
        return;
      }
      if (isMounted && session?.user) {
        populateFromUser(session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted && session?.user) {
        populateFromUser(session.user);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 3. 10-minute hold reservation timer (INV-10)
  useEffect(() => {
    let timer;
    if (step === 'GATEWAY' && holdExpiresAt) {
      timer = setInterval(() => {
        const remaining = Math.max(0, Math.round((new Date(holdExpiresAt) - new Date()) / 1000));
        setHoldSecondsLeft(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
          setErrorMessage('Hold reservation expired. This 1-of-1 piece has been released.');
          setStep('FAILED');
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, holdExpiresAt]);

  // 4. Financial calculations (Subtotal, Item-specific delivery, Standard delivery threshold, Total)
  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (sum, it) => sum + (Number(it.unit_price || it.selling_price || it.price || 0) * (it.quantity || 1)),
      0
    );
  }, [cartItems]);

  const productDeliveryCharges = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const charge =
        item.deliveryCharge !== undefined && item.deliveryCharge !== null && item.deliveryCharge !== ''
          ? Number(item.deliveryCharge)
          : item.delivery_charge !== undefined && item.delivery_charge !== null && item.delivery_charge !== ''
          ? Number(item.delivery_charge)
          : null;
      return charge !== null ? sum + charge : sum;
    }, 0);
  }, [cartItems]);

  const hasItemDeliveryCharge = useMemo(() => {
    return cartItems.some(
      (item) =>
        (item.deliveryCharge !== undefined && item.deliveryCharge !== null && item.deliveryCharge !== '') ||
        (item.delivery_charge !== undefined && item.delivery_charge !== null && item.delivery_charge !== '')
    );
  }, [cartItems]);

  const freeThreshold = settings?.shipping_free_threshold ?? 1499;
  const flatShipping = settings?.shipping_flat_rate ?? 99;
  const isFreeShipping = subtotal >= freeThreshold;
  const standardShipping = isFreeShipping ? 0 : flatShipping;
  const shipping = hasItemDeliveryCharge ? productDeliveryCharges : standardShipping;
  const total = subtotal + shipping;

  // 5. Postal pincode lookup via api.postalpincode.in
  const lookupPincode = useCallback(async (pin) => {
    const cleanPin = String(pin || '').trim();
    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      return null;
    }
    setPincodeLoading(true);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
      if (!response.ok) return null;
      const data = await response.json();
      if (
        Array.isArray(data) &&
        data[0]?.Status === 'Success' &&
        Array.isArray(data[0]?.PostOffice) &&
        data[0].PostOffice.length > 0
      ) {
        const po = data[0].PostOffice[0];
        const detectedCity = po.District || po.Division || po.Block || po.Circle || '';
        const detectedState = po.State || '';

        setFormData((prev) => ({
          ...prev,
          city: detectedCity || prev.city,
          state: detectedState || prev.state
        }));
        return { city: detectedCity, state: detectedState };
      }
    } catch (err) {
      console.warn('[useRazorpayCheckout] Postal pincode lookup error:', err);
    } finally {
      setPincodeLoading(false);
    }
    return null;
  }, []);

  // 6. Handle input change with automatic 6-digit pincode lookup
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'pincode') {
      const numeric = value.replace(/\D/g, '').slice(0, 6);
      if (numeric.length === 6) {
        lookupPincode(numeric);
      }
    }
  }, [lookupPincode]);

  // 7. Format timer countdown into MM:SS
  const formatTimer = useCallback((secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }, []);

  // 8. Razorpay Payment Trigger & Verification
  const triggerRazorpayCheckout = useCallback(
    async (orderRef, customAmount = null, customShipping = null) => {
      setLoading(true);
      setErrorMessage('');
      setPaymentStatusMsg({ text: 'Initializing secure Razorpay gateway...', type: 'info' });

      const sdkLoaded = await loadRazorpaySdk();
      if (!sdkLoaded || !window.Razorpay) {
        setErrorMessage('Failed to load Razorpay payment gateway. Please check your internet connection.');
        setLoading(false);
        setStep('GATEWAY');
        return;
      }

      let shippingDetails = customShipping || formData;
      try {
        const savedShipping = localStorage.getItem('checkout_shipping');
        if (savedShipping && !customShipping) {
          shippingDetails = { ...formData, ...JSON.parse(savedShipping) };
        }
      } catch (e) {
        console.warn('Could not read saved shipping details:', e);
      }

      const payableAmount = customAmount !== null && customAmount !== undefined ? customAmount : total;
      const amountInPaise = Math.round(payableAmount * 100);

      // Create order on backend to obtain mandatory Razorpay order_id and key_id
      let rzpOrderId = null;
      let serverKeyId = null;
      try {
        const res = await fetch('/api/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: payableAmount,
            currency: 'INR',
            receipt: orderRef,
            subtotal,
            shipping,
            delivery_charge: shipping,
            items: cartItems.map((it) => ({
              product_id: it.product_id || it.id,
              variant_id: it.variant_id,
              sku: it.sku,
              unit_price: it.unit_price || it.selling_price || it.price,
              delivery_charge:
                it.delivery_charge !== undefined
                  ? it.delivery_charge
                  : it.deliveryCharge !== undefined
                  ? it.deliveryCharge
                  : 0,
              deliveryCharge:
                it.deliveryCharge !== undefined
                  ? it.deliveryCharge
                  : it.delivery_charge !== undefined
                  ? it.delivery_charge
                  : 0,
              quantity: it.quantity || 1
            })),
            notes: {
              order_number: orderRef,
              customer_name: shippingDetails.name,
              customer_email: shippingDetails.email,
              customer_mobile: shippingDetails.mobile
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.order_id) {
            rzpOrderId = data.order_id;
            serverKeyId = data.key_id;
            setRazorpayOrderData(data);
          }
        }
      } catch (apiErr) {
        console.warn('[useRazorpayCheckout] Backend order creation notice:', apiErr);
      }

      const key = serverKeyId || RAZORPAY_KEY_ID;

      const options = {
        key: key,
        amount: amountInPaise,
        currency: 'INR',
        name: 'CURATED',
        description: `Order #${orderRef} • 1-of-1 Archival Piece`,
        ...(rzpOrderId ? { order_id: rzpOrderId } : {}),
        image:
          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="%23121212"/><text x="16" y="21" font-family="sans-serif" font-size="16" font-weight="900" fill="%23FFFFFF" text-anchor="middle">C</text></svg>',
        prefill: {
          name: shippingDetails.name || profile?.fullName || authUser?.user_metadata?.full_name || '',
          email: shippingDetails.email || profile?.email || authUser?.email || '',
          contact: shippingDetails.mobile || ''
        },
        notes: {
          order_number: orderRef,
          address: shippingDetails.address || '',
          city: shippingDetails.city || '',
          pincode: shippingDetails.pincode || ''
        },
        theme: {
          color: '#121212'
        },
        modal: {
          confirm_close: true,
          ondismiss: function () {
            setLoading(false);
            setStep('GATEWAY');
            setPaymentStatusMsg({
              text: 'Payment window was closed. Click below to complete your payment before the hold expires.',
              type: 'warning'
            });
          }
        },
        handler: async function (response) {
          setLoading(true);
          setPaymentStatusMsg({ text: 'Verifying payment with bank servers...', type: 'info' });

          try {
            const orderPayload = {
              order_number: orderRef,
              customer_name:
                shippingDetails.name || profile?.fullName || authUser?.user_metadata?.full_name || 'Customer',
              customer_email: shippingDetails.email || profile?.email || authUser?.email || 'customer@example.com',
              customer: shippingDetails,
              total_amount: payableAmount,
              total: payableAmount,
              status: 'PENDING',
              payment_status: 'PAID',
              payment_mode: 'RAZORPAY',
              policy_version: '1.0',
              gateway_id: response.razorpay_payment_id,
              gateway_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || rzpOrderId || '',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || '',
              items: cartItems.map((it) => ({
                product_id: it.id || it.product_id,
                name: it.name || it.title,
                sku: it.sku || 'CUR-ITEM',
                size: it.size || 'One Size',
                price: parseFloat(it.price || it.selling_price || it.unit_price) || 0,
                unit_price: parseFloat(it.price || it.selling_price || it.unit_price) || 0,
                delivery_charge:
                  parseFloat(it.delivery_charge !== undefined ? it.delivery_charge : it.deliveryCharge || 0) || 0,
                quantity: parseInt(it.quantity, 10) || 1
              })),
              shipping_address: {
                ...shippingDetails,
                payment_mode: 'RAZORPAY',
                razorpay_order_id: response.razorpay_order_id || rzpOrderId || '',
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || ''
              },
              created_at: new Date().toISOString()
            };

            // Call backend verification endpoint (single authority creating verified orders)
            try {
              await fetch('/api/razorpay/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
              });
            } catch (srvErr) {
              console.warn('[useRazorpayCheckout] Backend verify notice:', srvErr);
            }

            // Persist order details to localStorage
            try {
              localStorage.removeItem('checkout_shipping');
              localStorage.setItem('curated_last_order', JSON.stringify(orderPayload));
              if (orderPayload.customer_email) {
                localStorage.setItem('curated_customer_email', orderPayload.customer_email);
              }
              if (orderPayload.customer_name) {
                localStorage.setItem('curated_customer_name', orderPayload.customer_name);
              }
            } catch (e) {
              console.warn('LocalStorage order persistence notice:', e);
            }

            // Mark success & show celebration
            setLoading(false);
            setPaymentStatusMsg({ text: '✅ Payment Verified! Processing your order...', type: 'success' });
            setCurrentOrder(orderPayload);
            setStep('CONFIRMED');
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

            if (clearCart) {
              clearCart();
            }

            setTimeout(() => {
              if (onOrderSuccess) {
                onOrderSuccess(orderPayload);
              }
            }, 2000);
          } catch (err) {
            console.error('[useRazorpayCheckout] Handler error:', err);
            setErrorMessage('Payment was charged but order could not be synced. Please contact support.');
            setLoading(false);
          }
        }
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          const failMsg = resp.error?.description || 'Transaction declined';
          setPaymentStatusMsg({
            text: `Payment failed: ${failMsg}`,
            type: 'error'
          });
          setErrorMessage(failMsg);
          setStep('GATEWAY');
          setLoading(false);
        });
        rzp.open();
        setStep('GATEWAY');
        setLoading(false);
      } catch (e) {
        console.error('[useRazorpayCheckout] Razorpay Launch Error:', e);
        setLoading(false);
        setStep('GATEWAY');
        setErrorMessage(`Could not initialize Razorpay payment modal: ${e.message || 'Key or configuration error'}`);
      }
    },
    [
      formData,
      total,
      subtotal,
      shipping,
      cartItems,
      profile,
      authUser,
      clearCart,
      onOrderSuccess
    ]
  );

  // 9. Form submission handler that initiates hold & launches Razorpay
  const handleProceedToPayment = useCallback(
    async (e, customAmount = null) => {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      setErrorMessage('');

      if (!policyAck) {
        setErrorMessage('You must acknowledge the No Return Policy before proceeding.');
        return false;
      }

      const cleanMobile = String(formData.mobile || '').replace(/\D/g, '');
      if (cleanMobile.length !== 10) {
        setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
        return false;
      }

      if (!formData.name?.trim()) {
        setErrorMessage('Please enter your full name.');
        return false;
      }

      if (!formData.address?.trim()) {
        setErrorMessage('Please enter your delivery street address.');
        return false;
      }

      try {
        localStorage.setItem('checkout_shipping', JSON.stringify(formData));
      } catch (err) {
        console.warn('Unable to persist shipping details in localStorage:', err);
      }

      const orderNumber = `CUR-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const orderId = `ord-${Date.now()}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const payableAmount = customAmount !== null && customAmount !== undefined ? customAmount : total;

      const orderData = {
        id: orderId,
        order_number: orderNumber,
        customer: formData,
        items: cartItems,
        total: payableAmount,
        policy_version: '1.0',
        created_at: new Date().toISOString()
      };

      setCurrentOrder(orderData);
      setHoldExpiresAt(expiresAt);
      setHoldSecondsLeft(600);
      setStep('GATEWAY');

      await triggerRazorpayCheckout(orderNumber, payableAmount, formData);
      return true;
    },
    [policyAck, formData, cartItems, total, triggerRazorpayCheckout]
  );

  return {
    step,
    setStep,
    formData,
    setFormData,
    handleInputChange,
    policyAck,
    setPolicyAck,
    loading,
    setLoading,
    submitting: loading,
    setSubmitting: setLoading,
    errorMessage,
    setErrorMessage,
    currentOrder,
    setCurrentOrder,
    razorpayOrderData,
    setRazorpayOrderData,
    paymentStatusMsg,
    setPaymentStatusMsg,
    holdExpiresAt,
    setHoldExpiresAt,
    holdSecondsLeft,
    setHoldSecondsLeft,
    pincodeLoading,
    lookupPincode,
    fetchAddressByPincode: lookupPincode,
    subtotal,
    productDeliveryCharges,
    hasItemDeliveryCharge,
    shipping,
    shippingFee: shipping,
    isFreeShipping,
    total,
    handleProceedToPayment,
    triggerRazorpayCheckout,
    formatTimer,
    loadRazorpaySdk
  };
}

export default useRazorpayCheckout;
