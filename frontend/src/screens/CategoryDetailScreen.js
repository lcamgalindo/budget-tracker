import { useState, useEffect } from 'react';
import { API_BASE } from '../api';
import { styles, getProgressColor } from '../styles';
import { BackIcon, Spinner } from '../components/Icons';

export default function CategoryDetailScreen({ category, budgetInfo, month, onBack, onReceiptSelect }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url = `${API_BASE}/receipts?category_id=${category.id}&limit=50`;
    if (month) {
      url += `&year=${month.year}&month=${month.month}`;
    }
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setReceipts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category.id, month]);

  const pct = budgetInfo?.monthly_limit > 0 ? budgetInfo.percent_used : 0;

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <BackIcon />
        </button>
        <h1 style={styles.headerTitle}>{category.name}</h1>
        <div style={{ width: 20 }} />
      </header>

      {budgetInfo && (
        <div style={detailStyles.summaryCard}>
          <div style={detailStyles.summaryRow}>
            <span style={detailStyles.spent}>
              ${Number(budgetInfo.spent_this_month).toFixed(2)}
            </span>
            <span style={detailStyles.limit}>
              / ${Number(budgetInfo.monthly_limit).toFixed(2)}
            </span>
          </div>
          <div style={detailStyles.remaining}>
            ${Math.abs(Number(budgetInfo.remaining)).toFixed(2)} {budgetInfo.remaining >= 0 ? 'remaining' : 'over'}
          </div>
          <div style={styles.progressTrack}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${Math.min(100, pct)}%`,
                backgroundColor: getProgressColor(pct)
              }} 
            />
          </div>
        </div>
      )}

      <h2 style={detailStyles.sectionTitle}>Transactions</h2>

      {loading ? (
        <div style={styles.centered}>
          <Spinner />
        </div>
      ) : receipts.length === 0 ? (
        <p style={detailStyles.empty}>No expenses in this category</p>
      ) : (
        <div style={detailStyles.list}>
          {receipts.map(r => (
            <button 
              key={r.id} 
              style={detailStyles.item}
              onClick={() => onReceiptSelect(r)}
            >
              <div style={detailStyles.itemLeft}>
                <span style={detailStyles.merchant}>
                  {r.merchant_name || 'Unknown'}
                </span>
                <span style={detailStyles.date}>
                  {r.transaction_date 
                    ? new Date(r.transaction_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'No date'}
                </span>
              </div>
              <span style={detailStyles.amount}>
                ${Number(r.grand_total).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const detailStyles = {
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    border: '1px solid #e2e8f0',
    marginBottom: 24,
  },
  summaryRow: {
    marginBottom: 4,
  },
  spent: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1e293b',
  },
  limit: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: 500,
  },
  remaining: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 12,
  },
  empty: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    padding: 40,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    width: '100%',
    cursor: 'pointer',
    textAlign: 'left',
  },
  itemLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  merchant: {
    fontSize: 14,
    fontWeight: 500,
    color: '#1e293b',
  },
  date: {
    fontSize: 12,
    color: '#64748b',
  },
  amount: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
  },
};