import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiCreditCard, FiSmartphone, FiClock, FiAlertTriangle, FiCheck, FiX, FiZap, FiDollarSign, FiPercent } from 'react-icons/fi';

const PaymentModal = ({ isOpen, onClose, amount, onConfirm, loading, bookingDetails }) => {
  const [paymentType, setPaymentType] = useState('booking'); // 'booking' or 'full'
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'upi', 'wallet'
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [dynamicPricing, setDynamicPricing] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [isPaymentExpired, setIsPaymentExpired] = useState(false);

  // Calculate dynamic pricing based on demand, time, etc.
  useEffect(() => {
    if (bookingDetails) {
      const basePrice = amount;
      const currentHour = new Date().getHours();
      const isPeakHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
      const demandMultiplier = isPeakHour ? 1.2 : 1.0;
      const dynamicAmount = Math.round((basePrice * demandMultiplier - basePrice) * 100) / 100;
      setDynamicPricing(dynamicAmount);
    }
  }, [amount, bookingDetails]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsPaymentExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeRemaining]);

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeRemaining(300);
      setIsPaymentExpired(false);
    }
  }, [isOpen]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTotalAmount = () => {
    const baseAmount = paymentType === 'booking' ? amount * 0.2 : amount;
    return baseAmount + dynamicPricing;
  };

  const handlePaymentConfirm = () => {
    if (isPaymentExpired) {
      toast.error('Payment session has expired. Please try again.');
      return;
    }

    if (paymentMethod === 'upi' && !upiId) {
      toast.error('Please enter your UPI ID');
      return;
    }

    if (paymentMethod === 'card' && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name)) {
      toast.error('Please fill in all card details');
      return;
    }

    onConfirm({
      paymentType,
      paymentMethod,
      amount: calculateTotalAmount(),
      originalAmount: amount,
      dynamicPricing,
      penalty: 0,
      paymentDetails: paymentMethod === 'upi' ? { upiId } : cardDetails
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Payment Options</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
          
          {/* Timer */}
          <div className="mt-4 flex items-center justify-center">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              timeRemaining > 60 ? 'bg-green-500/20 text-green-400' : 
              timeRemaining > 30 ? 'bg-yellow-500/20 text-yellow-400' : 
              'bg-red-500/20 text-red-400'
            }`}>
              <FiClock className="h-4 w-4" />
              <span className="font-mono font-bold">
                {isPaymentExpired ? 'EXPIRED' : formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          {isPaymentExpired && (
            <div className="mt-4 flex items-center space-x-2 text-red-400 bg-red-500/20 p-3 rounded-lg">
              <FiAlertTriangle className="h-5 w-5" />
              <span>Payment session expired. Please refresh to try again.</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Payment Type Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Choose Payment Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentType('booking')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentType === 'booking'
                    ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FiPercent className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-semibold">Booking Payment (20%)</div>
                    <div className="text-sm opacity-75">Initial partial payment</div>
                    <div className="text-lg font-bold">${(amount * 0.2).toFixed(2)}</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPaymentType('full')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentType === 'full'
                    ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FiDollarSign className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-semibold">Full Slot Payment</div>
                    <div className="text-sm opacity-75">Pay complete amount</div>
                    <div className="text-lg font-bold">${amount.toFixed(2)}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Pricing Info */}
          {dynamicPricing > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-400 mb-2">
                <FiZap className="h-5 w-5" />
                <span className="font-semibold">Dynamic Pricing Applied</span>
              </div>
              <p className="text-yellow-300 text-sm">
                Peak hour pricing: +${dynamicPricing.toFixed(2)} (demand-based adjustment)
              </p>
            </div>
          )}

          {/* No-Show Policy Warning */}
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-orange-400 mb-2">
              <FiAlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Important Booking Policy</span>
            </div>
            <div className="text-orange-300 text-sm space-y-1">
              <p>• Booking payment is <strong>non-refundable</strong></p>
              <p>• No-show penalty: Additional ${(amount * 0.15).toFixed(2)} if you don't arrive within 15 minutes of booking time</p>
              <p>• Late arrival: ${(amount * 0.10).toFixed(2)} penalty if more than 10 minutes late</p>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                }`}
              >
                <FiCreditCard className="h-6 w-6 mx-auto mb-2" />
                <div className="font-semibold">Credit/Debit Card</div>
              </button>

              <button
                onClick={() => setPaymentMethod('upi')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                }`}
              >
                <FiSmartphone className="h-6 w-6 mx-auto mb-2" />
                <div className="font-semibold">UPI</div>
              </button>

              <button
                onClick={() => setPaymentMethod('wallet')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'wallet'
                    ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                }`}
              >
                <FiSmartphone className="h-6 w-6 mx-auto mb-2" />
                <div className="font-semibold">Digital Wallet</div>
              </button>
            </div>
          </div>

          {/* Payment Details Form */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Payment Details</h3>
            
            {paymentMethod === 'card' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardDetails.name}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-slate-700 text-white"
                    disabled={loading || isPaymentExpired}
                  />
                </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Card Number
            </label>
            <input
              type="text"
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, number: e.target.value }))}
              placeholder="1234 5678 9012 3456"
              className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-slate-700 text-white"
                    disabled={loading || isPaymentExpired}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails(prev => ({ ...prev, expiry: e.target.value }))}
                placeholder="MM/YY"
                className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-slate-700 text-white"
                      disabled={loading || isPaymentExpired}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                CVV
              </label>
              <input
                type="text"
                      value={cardDetails.cvv}
                      onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value }))}
                placeholder="123"
                className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-slate-700 text-white"
                      disabled={loading || isPaymentExpired}
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  UPI ID
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="username@upi"
                  className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-slate-700 text-white"
                  disabled={loading || isPaymentExpired}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Enter your UPI ID (e.g., john@okicici, 9876543210@paytm)
                </p>
              </div>
            )}

            {paymentMethod === 'wallet' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button className="p-4 border border-slate-600 rounded-lg hover:border-slate-500 transition-colors">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white">Paytm</div>
                      <div className="text-sm text-slate-400">Digital Wallet</div>
                    </div>
                  </button>
                  <button className="p-4 border border-slate-600 rounded-lg hover:border-slate-500 transition-colors">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white">PhonePe</div>
                      <div className="text-sm text-slate-400">Digital Wallet</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300">Base Amount:</span>
                <span className="text-white">${paymentType === 'booking' ? (amount * 0.2).toFixed(2) : amount.toFixed(2)}</span>
              </div>
              {dynamicPricing > 0 && (
                <div className="flex justify-between">
                  <span className="text-yellow-400">Dynamic Pricing:</span>
                  <span className="text-yellow-400">+${dynamicPricing.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-600 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-white">Total Amount:</span>
                  <span className="text-xl font-bold text-primary-400">${calculateTotalAmount().toFixed(2)}</span>
                </div>
            </div>
          </div>
        </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
              className="px-6 py-3 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
              onClick={handlePaymentConfirm}
              disabled={loading || isPaymentExpired}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-opacity flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FiCheck className="h-4 w-4" />
                  <span>Pay ${calculateTotalAmount().toFixed(2)}</span>
                </>
              )}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal; 