import { useState } from 'react';
import toast from 'react-hot-toast';

const PaymentModal = ({ isOpen, onClose, amount, onConfirm, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-w-md w-full mx-auto p-6 relative">
        <h2 className="text-xl font-semibold text-white mb-4">Complete Payment</h2>
        
        <div className="mb-6">
          <p className="text-slate-300 mb-2">Total Amount:</p>
          <p className="text-2xl font-bold text-primary-400">${amount.toFixed(2)}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Card Number
            </label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-slate-700 text-white"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                placeholder="MM/YY"
                className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-slate-700 text-white"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                CVV
              </label>
              <input
                type="text"
                placeholder="123"
                className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 bg-slate-700 text-white"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal; 