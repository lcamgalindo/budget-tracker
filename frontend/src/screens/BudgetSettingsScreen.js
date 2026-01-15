import { useState, useEffect } from 'react';
import { getCategories, getBudget, API_BASE } from '../api';
import { styles } from '../styles';
import { BackIcon } from '../components/Icons';

function formatMonthDisplay(year, month) {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function BudgetSettingsScreen({ month, onBack, onManageCategories }) {
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    Promise.all([
      getCategories(), 
      getBudget(month.year, month.month)
    ])
      .then(([cats, budgetData]) => {
        setCategories(cats.filter(c => c.is_active));
        const budgetMap = {};
        budgetData.by_category.forEach(b => {
          budgetMap[b.category.id] = b.monthly_limit;
        });
        setBudgets(budgetMap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [month.year, month.month]);

  const handleSave = async (categoryId, value) => {
    const amount = parseFloat(value) || 0;
    setSaving(categoryId);
    
    try {
      await fetch(`${API_BASE}/budget/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category_id: categoryId,
          monthly_limit: amount,
          year: month.year,
          month: month.month,
        }),
      });
      setBudgets(prev => ({ ...prev, [categoryId]: amount }));
    } catch (e) {
      console.error('Failed to save budget', e);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div style={{...styles.screen, ...styles.centered}}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <BackIcon />
        </button>
        <h1 style={styles.headerTitle}>Budget Settings</h1>
        <div style={{ width: 20 }} />
      </header>

      <p style={settingsStyles.description}>
        Budget limits for {formatMonthDisplay(month.year, month.month)}
      </p>

      <button style={settingsStyles.manageLink} onClick={onManageCategories}>
        Manage Categories →
      </button>

      <div style={settingsStyles.list}>
        {categories.map(cat => (
          <div key={cat.id} style={settingsStyles.item}>
            <span style={settingsStyles.categoryName}>{cat.name}</span>
            <div style={settingsStyles.inputWrapper}>
              <span style={settingsStyles.currency}>$</span>
              <input
                type="number"
                inputMode="decimal"
                style={settingsStyles.input}
                value={budgets[cat.id] || ''}
                placeholder="0"
                onChange={(e) => setBudgets(prev => ({ 
                  ...prev, 
                  [cat.id]: e.target.value 
                }))}
                onBlur={(e) => handleSave(cat.id, e.target.value)}
              />
              {saving === cat.id && (
                <span style={settingsStyles.savingIndicator}>...</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const settingsStyles = {
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  manageLink: {
    fontSize: 14,
    fontWeight: 500,
    color: '#6366f1',
    backgroundColor: 'transparent',
    border: 'none',
    padding: 0,
    marginBottom: 20,
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    border: '1px solid #e2e8f0',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: 500,
    color: '#1e293b',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  currency: {
    position: 'absolute',
    left: 10,
    color: '#64748b',
    fontSize: 15,
  },
  input: {
    width: 100,
    padding: '8px 10px 8px 24px',
    fontSize: 15,
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    textAlign: 'right',
    outline: 'none',
  },
  savingIndicator: {
    marginLeft: 8,
    color: '#64748b',
  },
};