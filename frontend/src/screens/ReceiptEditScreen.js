import { useState, useEffect } from 'react';
import { getCategories, updateReceipt, API_BASE } from '../api';
import { styles } from '../styles';
import { BackIcon } from '../components/Icons';

export default function ReceiptEditScreen({ receipt, onBack, onSaved }) {
  const [merchant, setMerchant] = useState(receipt.merchant_name || '');
  const [amount, setAmount] = useState(receipt.grand_total?.toString() || '');
  const [categoryId, setCategoryId] = useState(receipt.category?.id || '');
  const [expenseType, setExpenseType] = useState(receipt.expense_type || 'personal');
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!merchant || !amount || !categoryId) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateReceipt(receipt.id, {
        merchant_name: merchant,
        grand_total: parseFloat(amount),
        category_id: categoryId,
        expense_type: expenseType,
      });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this receipt? This cannot be undone.')) {
      return;
    }
    
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/receipts/${receipt.id}`, { method: 'DELETE' });
      onSaved();
    } catch (e) {
      setError('Failed to delete');
      setDeleting(false);
    }
  };

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <BackIcon />
        </button>
        <h1 style={styles.headerTitle}>Edit Receipt</h1>
        <div style={{ width: 20 }} />
      </header>

      {receipt.image_url && (
        <div style={editStyles.imageContainer}>
          <img 
            src={receipt.image_url} 
            alt="Receipt" 
            style={editStyles.image}
          />
        </div>
      )}

      <div style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Merchant</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Where did you spend?"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Amount</label>
          <div style={styles.amountInput}>
            <span style={styles.currency}>$</span>
            <input
              style={{...styles.input, paddingLeft: 28}}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
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

        {error && <p style={styles.error}>{error}</p>}

        <button 
          style={styles.primaryBtn} 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button 
          style={editStyles.deleteBtn} 
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete Receipt'}
        </button>
      </div>
    </div>
  );
}

const editStyles = {
  imageContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  image: {
    width: '100%',
    maxHeight: 200,
    objectFit: 'cover',
  },
  deleteBtn: {
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: 12,
    cursor: 'pointer',
    marginTop: 8,
  },
};