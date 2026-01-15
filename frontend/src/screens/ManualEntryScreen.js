import { useState, useEffect } from 'react';
import { createManualEntry, getCategories } from '../api';
import { styles } from '../styles';
import { BackIcon } from '../components/Icons';

export default function ManualEntryScreen({ onSuccess, onCancel }) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseType, setExpenseType] = useState('personal');
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!merchant || !amount || !categoryId) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createManualEntry({
        merchant_name: merchant,
        grand_total: parseFloat(amount),
        category_id: categoryId,
        transaction_date: new Date(date).toISOString(),
        expense_type: expenseType,
      });
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onCancel}>
          <BackIcon />
        </button>
        <h1 style={styles.headerTitle}>Manual Entry</h1>
        <div style={{ width: 20 }} />
      </header>

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
          <label style={styles.label}>Date</label>
          <input
            style={styles.input}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
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
          style={{...styles.primaryBtn, marginTop: 12}} 
          onClick={handleSubmit} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Expense'}
        </button>
      </div>
    </div>
  );
}