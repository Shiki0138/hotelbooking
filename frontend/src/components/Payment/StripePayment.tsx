import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentFormProps {
  bookingId: string;
  amount: number;
  customerEmail: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  bookingId,
  amount,
  customerEmail,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/confirmation`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || '決済処理中にエラーが発生しました');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '予期しないエラーが発生しました';
      setErrorMessage(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-amount">
        <h3>お支払い金額</h3>
        <p className="amount">¥{amount.toLocaleString()}</p>
      </div>

      <PaymentElement 
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card'],
        }}
      />

      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="submit-button"
      >
        {isProcessing ? '処理中...' : `¥${amount.toLocaleString()} 支払う`}
      </button>

      <p className="security-note">
        <span className="lock-icon">🔒</span>
        お支払い情報は安全に暗号化されます
      </p>
    </form>
  );
};

interface StripePaymentProps {
  bookingId: string;
  amount: number;
  customerEmail: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

const StripePayment: React.FC<StripePaymentProps> = (props) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create payment intent
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId: props.bookingId,
            amount: props.amount,
            customerEmail: props.customerEmail,
          }),
        });

        const data = await response.json();

        if (data.success && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.error || '決済の初期化に失敗しました');
          props.onError(data.error || 'Payment initialization failed');
        }
      } catch (err) {
        const message = '決済システムに接続できませんでした';
        setError(message);
        props.onError(message);
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [props.bookingId, props.amount, props.customerEmail]);

  if (loading) {
    return (
      <div className="payment-loading">
        <div className="spinner"></div>
        <p>決済システムを準備中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          もう一度試す
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#667eea',
            colorBackground: '#ffffff',
            colorText: '#1a1a1a',
            colorDanger: '#e74c3c',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
          },
        },
        locale: 'ja',
      }}
    >
      <PaymentForm {...props} />
    </Elements>
  );
};

export default StripePayment;

// CSS styles
const styles = `
.payment-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.payment-amount {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.payment-amount h3 {
  font-size: 16px;
  color: #666;
  margin-bottom: 8px;
}

.payment-amount .amount {
  font-size: 32px;
  font-weight: bold;
  color: #1a1a1a;
}

.error-message {
  background: #fee;
  color: #e74c3c;
  padding: 12px;
  border-radius: 8px;
  margin: 16px 0;
  font-size: 14px;
}

.submit-button {
  width: 100%;
  padding: 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 24px;
}

.submit-button:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.security-note {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: #666;
}

.lock-icon {
  margin-right: 4px;
}

.payment-loading,
.payment-error {
  text-align: center;
  padding: 48px;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.payment-error button {
  margin-top: 16px;
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
`;