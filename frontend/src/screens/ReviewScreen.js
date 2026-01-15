import { useState, useEffect } from 'react';
import { updateReceipt, getCategories } from '../api';
import { styles } from '../styles';

export default function ReviewScreen({ receipt, onDone }) {
  const [categoryId, setCategoryId] = useState(receipt?.category?.id || '');
  const [expenseType, setExpenseType] = useState(receipt?.expense_type || 'personal');
  const [transactionDate, setTransactionDate] = useState(() => {
    if (receipt?.transaction_date) {
      return new Date(receipt.transaction_date).toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories()
      .then(data => {
        setCategories(data);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    const updates = {};
    if (categoryId && categoryId !== receipt?.category?.id) {
      updates.category_id = categoryId;
    }
    if (expenseType !== receipt?.expense_type) {
      updates.expense_type = expenseType;
    }
    
    const originalDate = receipt?.transaction_date 
      ? new Date(receipt.transaction_date).toISOString().split('T')[0]
      : null;
    if (transactionDate !== originalDate) {
      updates.transaction_date = new Date(transactionDate).toISOString();
    }
    
    if (Object.keys(updates).length > 0) {
      setSaving(true);
      await updateReceipt(receipt.id, updates);
      setSaving(false);
    }
    onDone();
  };

  if (!receipt) return null;

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <div style={{ width: 20 }} />
        <h1 style={styles.headerTitle}>Review</h1>
        <div style={{ width: 20 }} />
      </header>

      <div style={styles.receiptCard}>
        <div style={styles.receiptMerchant}>
          {receipt.merchant_name || 'Unknown Merchant'}
        </div>
        <div style={styles.receiptAmount}>
          ${Number(receipt.grand_total).toFixed(2)}
        </div>
      </div>

      <div style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Date</label>
          <input
            style={styles.input}
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
          />
          {!receipt.transaction_date && (
            <p style={styles.hint}>Date not detected — please verify</p>
          )}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Category</label>
          <select 
            style={styles.select}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Select category</option>
            {categories.filter(c => c.is_active).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {receipt.needs_review && (
            <p style={styles.hint}>Low confidence — please verify the category</p>
          )}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Type</label>
          <div style={styles.segmentedControl}>
            <button
              style={{
                ...styles.segment,
                ...(expenseType === 'personal' ? styles.segmentActive : {})
              }}
              onClick={() => setExpenseType('personal')}
            >
              Personal
            </button>
            <button
              style={{
                ...styles.segment,
                ...(expenseType === 'household' ? styles.segmentActive : {})
              }}
              onClick={() => setExpenseType('household')}
            >
              Household
            </button>
          </div>
        </div>

        <button 
          style={styles.primaryBtn} 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}