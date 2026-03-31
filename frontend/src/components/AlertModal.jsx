import { useState } from 'react';
import { Bell, X, AlertCircle } from 'lucide-react';
import { alertApi } from '../services/api';

/**
 * AlertModal Component
 * Modal for creating price alerts on products
 * 
 * Props:
 *   isOpen       - boolean (whether modal is visible)
 *   product      - Product object with productKey, productName, price
 *   onClose      - () => void (close modal callback)
 *   onSuccess    - () => void (called after successful alert creation)
 */
export default function AlertModal({ isOpen, product, onClose, onSuccess }) {
  const [targetPrice, setTargetPrice] = useState(product?.price ? Math.round(product.price * 0.8) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setTargetPrice(product?.price ? Math.round(product.price * 0.8) : '');
    setError('');
    setSuccess(false);
    onClose();
  };

  const handleCreateAlert = async () => {
    setError('');

    // Validation
    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      setError('Please enter a valid target price');
      return;
    }

    if (!product?.productKey) {
      setError('Product information is missing');
      return;
    }

    // DEBUG: Check if token exists
    const token = localStorage.getItem('omni_token');
    console.log('🔐 JWT Token exists:', !!token);
    console.log('🔐 Token preview:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');
    
    if (!token) {
      setError('Session expired. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const result = await alertApi.create(
        product.productKey,
        product.productName,
        parseFloat(targetPrice)
      );

      setSuccess(true);
      setError('');
      console.log('✅ Alert created:', result);
      
      // Close after 2 seconds
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 2000);
    } catch (err) {
      console.error('❌ Alert creation error:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        error: err.message,
      });
      
      const errMsg = err.response?.status === 401 
        ? 'Not authenticated. Please login again.'
        : err.response?.data?.message || err.message || 'Failed to create alert';
      setError(errMsg);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleCreateAlert();
    }
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  const currentPrice = product?.price || 0;
  const savingsPercent = targetPrice ? Math.round(((currentPrice - targetPrice) / currentPrice) * 100) : 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        width: '100%',
        maxWidth: 400,
        padding: 32,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        animation: 'slideUp 0.3s ease-out',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Set Price Alert
            </h2>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-3)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Product Info */}
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 4px 0' }}>Product</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            {product?.productName || 'Unknown Product'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '8px 0 0 0' }}>Current Price</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', margin: '4px 0 0 0' }}>
            ₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Target Price Input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-3)',
            display: 'block',
            marginBottom: 8,
          }}>
            Target Price (₹)
          </label>
          <input
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter target price..."
            disabled={loading || success}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
              borderRadius: 8,
              background: 'var(--surface-2)',
              color: 'var(--text)',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = error ? '#ef4444' : 'var(--primary)';
              e.target.style.background = 'var(--surface-3)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? '#ef4444' : 'var(--border)';
              e.target.style.background = 'var(--surface-2)';
            }}
          />
          {targetPrice && savingsPercent > 0 && (
            <p style={{
              fontSize: 12,
              color: '#10b981',
              margin: '8px 0 0 0',
            }}>
              💰 Save ~₹{(currentPrice - parseFloat(targetPrice)).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({savingsPercent}%)
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}>
            <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
            <p style={{
              fontSize: 12,
              color: '#ef4444',
              margin: 0,
              lineHeight: 1.4,
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}>
            <p style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#10b981',
              margin: 0,
              textAlign: 'center',
            }}>
              ✓ Alert created! Redirecting...
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleClose}
            disabled={loading || success}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--text-2)',
              cursor: loading || success ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading || success ? 0.6 : 1,
            }}
            onMouseOver={(e) => {
              if (!loading && !success) {
                e.target.style.background = 'var(--surface-2)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateAlert}
            disabled={loading || success}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              borderRadius: 8,
              background: success ? '#10b981' : 'var(--primary)',
              color: '#fff',
              cursor: loading || success ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading || success ? 0.8 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onMouseOver={(e) => {
              if (!loading && !success) {
                e.target.style.opacity = '0.9';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.opacity = '1';
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 12,
                  height: 12,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Creating...
              </>
            ) : success ? (
              '✓ Created!'
            ) : (
              'Create Alert'
            )}
          </button>
        </div>

        {/* Info Text */}
        <p style={{
          fontSize: 12,
          color: 'var(--text-3)',
          margin: '16px 0 0 0',
          textAlign: 'center',
        }}>
          You'll get notified when price drops below ₹{targetPrice || '—'}
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
