import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { walletAPI } from '../api';
import './WalletModal.css';

const WalletModal = ({ isOpen, onClose, walletBalance, onBalanceUpdate }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, purchasesRes, transactionsRes] = await Promise.all([
        walletAPI.getPlans(),
        walletAPI.getPurchases(),
        walletAPI.getTransactions()
      ]);
      setPlans(plansRes.data);
      setPurchases(purchasesRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plan) => {
    setPurchasing(plan.id);
    try {
      const currency = language === 'fa' ? 'IRR' : 'USD';
      const response = await walletAPI.createPurchase(plan.id, currency);
      
      // For demo purposes, auto-complete the purchase
      // In production, this would redirect to payment gateway
      const completeRes = await walletAPI.completePurchase(
        response.data.purchase_id,
        'demo_' + Date.now(),
        'demo'
      );
      
      toast.success(
        language === 'fa' 
          ? `${plan.credits} اعتبار به کیف پول شما اضافه شد!`
          : `${plan.credits} credits added to your wallet!`
      );
      
      if (onBalanceUpdate) {
        onBalanceUpdate(parseFloat(completeRes.data.new_balance));
      }
      
      loadData();
    } catch (error) {
      toast.error(
        language === 'fa'
          ? 'خطا در خرید اعتبار'
          : 'Error purchasing credits'
      );
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (plan) => {
    if (language === 'fa') {
      return `${Number(plan.price_irr).toLocaleString('fa-IR')} تومان`;
    }
    return `$${plan.price_usd}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    if (language === 'fa') {
      return date.toLocaleDateString('fa-IR');
    }
    return date.toLocaleDateString('en-US');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      completed: { class: 'success', fa: 'تکمیل شده', en: 'Completed' },
      pending: { class: 'warning', fa: 'در انتظار', en: 'Pending' },
      failed: { class: 'error', fa: 'ناموفق', en: 'Failed' },
      refunded: { class: 'info', fa: 'بازگشت داده شده', en: 'Refunded' }
    };
    const s = statusMap[status] || statusMap.pending;
    return (
      <span className={`status-badge ${s.class}`}>
        {language === 'fa' ? s.fa : s.en}
      </span>
    );
  };

  const getTransactionIcon = (type) => {
    const icons = {
      deposit: '💰',
      withdrawal: '💸',
      service: '⚙️',
      bonus: '🎁',
      refund: '↩️'
    };
    return icons[type] || '📝';
  };

  if (!isOpen) return null;

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div 
        className={`wallet-modal theme-${theme}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wallet-modal-header">
          <div className="wallet-header-info">
            <h2>{language === 'fa' ? 'کیف پول' : 'Wallet'}</h2>
            <div className="wallet-balance-display">
              <span className="balance-label">
                {language === 'fa' ? 'موجودی:' : 'Balance:'}
              </span>
              <span className="balance-amount">{walletBalance} {language === 'fa' ? 'اعتبار' : 'Credits'}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="wallet-tabs">
          <button 
            className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            {language === 'fa' ? '🛒 خرید اعتبار' : '🛒 Buy Credits'}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            {language === 'fa' ? '📋 تاریخچه خرید' : '📋 Purchase History'}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            {language === 'fa' ? '📊 تراکنش‌ها' : '📊 Transactions'}
          </button>
        </div>

        <div className="wallet-modal-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>{language === 'fa' ? 'در حال بارگذاری...' : 'Loading...'}</span>
            </div>
          ) : (
            <>
              {/* Plans Tab */}
              {activeTab === 'plans' && (
                <div className="plans-grid">
                  {plans.map((plan) => (
                    <div 
                      key={plan.id} 
                      className={`plan-card ${plan.is_popular ? 'popular' : ''}`}
                    >
                      {plan.is_popular && (
                        <div className="popular-badge">
                          {language === 'fa' ? 'محبوب‌ترین' : 'Most Popular'}
                        </div>
                      )}
                      <div className="plan-icon">{plan.icon}</div>
                      <h3 className="plan-name">
                        {language === 'fa' ? plan.name_fa : plan.name}
                      </h3>
                      <div className="plan-credits">
                        {plan.credits.toLocaleString()} {language === 'fa' ? 'اعتبار' : 'Credits'}
                      </div>
                      <div className="plan-price">{formatPrice(plan)}</div>
                      <p className="plan-description">
                        {language === 'fa' ? plan.description_fa : plan.description}
                      </p>
                      <ul className="plan-features">
                        {(language === 'fa' ? plan.features_fa : plan.features).map((feature, idx) => (
                          <li key={idx}>
                            <span className="check">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <button 
                        className={`purchase-btn ${plan.is_popular ? 'primary' : 'secondary'}`}
                        onClick={() => handlePurchase(plan)}
                        disabled={purchasing === plan.id}
                      >
                        {purchasing === plan.id ? (
                          <span className="loading-spinner-small"></span>
                        ) : (
                          language === 'fa' ? 'خرید' : 'Purchase'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Purchases Tab */}
              {activeTab === 'purchases' && (
                <div className="purchases-list">
                  {purchases.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">🛒</span>
                      <p>{language === 'fa' ? 'هنوز خریدی انجام نداده‌اید' : 'No purchases yet'}</p>
                    </div>
                  ) : (
                    purchases.map((purchase) => (
                      <div key={purchase.id} className="purchase-item">
                        <div className="purchase-info">
                          <span className="purchase-plan">
                            {language === 'fa' ? purchase.plan_name_fa : purchase.plan_name}
                          </span>
                          <span className="purchase-credits">
                            {purchase.credits_purchased.toLocaleString()} {language === 'fa' ? 'اعتبار' : 'Credits'}
                          </span>
                        </div>
                        <div className="purchase-meta">
                          <span className="purchase-amount">
                            {purchase.currency === 'IRR' 
                              ? `${Number(purchase.amount_paid).toLocaleString('fa-IR')} تومان`
                              : `$${purchase.amount_paid}`
                            }
                          </span>
                          <span className="purchase-date">{formatDate(purchase.created_at)}</span>
                          {getStatusBadge(purchase.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Transactions Tab */}
              {activeTab === 'transactions' && (
                <div className="transactions-list">
                  {transactions.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">📊</span>
                      <p>{language === 'fa' ? 'هنوز تراکنشی ندارید' : 'No transactions yet'}</p>
                    </div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="transaction-item">
                        <div className="tx-icon">{getTransactionIcon(tx.transaction_type)}</div>
                        <div className="tx-info">
                          <span className="tx-description">{tx.description}</span>
                          <span className="tx-date">{formatDate(tx.created_at)}</span>
                        </div>
                        <div className={`tx-amount ${tx.transaction_type === 'deposit' || tx.transaction_type === 'bonus' ? 'positive' : 'negative'}`}>
                          {tx.transaction_type === 'deposit' || tx.transaction_type === 'bonus' ? '+' : '-'}
                          {Number(tx.amount).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
