import { useState, useEffect } from 'react';
import { getBudget } from '../api';
import { styles, getProgressColor } from '../styles';
import { PlusIcon, Spinner } from '../components/Icons';

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 16h4" />
      <circle cx="18" cy="14" r="2" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  );
}

function formatMonthDisplay(year, month) {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function DashboardScreen({ onAdd, onSettings, onCategorySelect, onMonthChange }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  useEffect(() => {
    setLoading(true);
    getBudget(year, month)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    if (onMonthChange) {
      onMonthChange({ year, month });
    }
  }, [year, month, onMonthChange]);

  const goToPrevMonth = () => {
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  };

  if (loading) {
    return (
      <div style={{...styles.screen, ...styles.centered}}>
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{...styles.screen, ...styles.centered}}>
        <p style={styles.emptyText}>Could not load budget data</p>
      </div>
    );
  }

  const percentUsed = data.total_budget > 0 
    ? (data.total_spent / data.total_budget) * 100 
    : 0;

  return (
    <div style={styles.screen}>
      <header style={styles.dashboardHeader}>
        <h1 style={styles.dashboardTitle}>Budget</h1>
        <div style={dashStyles.headerButtons}>
          <button style={dashStyles.settingsBtn} onClick={onSettings}>
            <SettingsIcon />
          </button>
          <button style={styles.addBtn} onClick={onAdd}>
            <PlusIcon />
          </button>
        </div>
      </header>

      <div style={dashStyles.monthNav}>
        <button style={dashStyles.monthBtn} onClick={goToPrevMonth}>
          <ChevronLeft />
        </button>
        <span style={dashStyles.monthLabel}>{formatMonthDisplay(year, month)}</span>
        <button 
          style={{
            ...dashStyles.monthBtn, 
            opacity: isCurrentMonth ? 0.3 : 1,
            cursor: isCurrentMonth ? 'default' : 'pointer'
          }} 
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
        >
          <ChevronRight />
        </button>
      </div>
      
      <div style={styles.summaryCard}>
        <div style={styles.summaryMain}>
          <span style={styles.summarySpent}>${Number(data.total_spent).toFixed(2)}</span>
          <span style={styles.summaryBudget}> / ${Number(data.total_budget).toFixed(2)}</span>
        </div>
        <div style={styles.summaryRemaining}>
          ${Math.abs(Number(data.total_remaining)).toFixed(2)} {data.total_remaining >= 0 ? 'remaining' : 'over budget'}
        </div>
        <div style={styles.progressTrack}>
          <div 
            style={{
              ...styles.progressFill,
              width: `${Math.min(100, percentUsed)}%`,
              backgroundColor: getProgressColor(percentUsed)
            }} 
          />
        </div>
      </div>

      {data.by_category.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Categories</h2>
          <div style={styles.categoryList}>
            {data.by_category.map(cat => {
              const pct = cat.monthly_limit > 0 ? cat.percent_used : 0;
              return (
                <button 
                  key={cat.category.id} 
                  style={dashStyles.categoryButton}
                  onClick={() => onCategorySelect(cat.category, cat, { year, month })}
                >
                  <div style={styles.categoryTop}>
                    <span style={styles.categoryName}>{cat.category.name}</span>
                    <span style={styles.categoryAmount}>
                      ${Number(cat.spent_this_month).toFixed(0)}
                      <span style={styles.categoryLimit}> / ${Number(cat.monthly_limit).toFixed(0)}</span>
                    </span>
                  </div>
                  <div style={styles.progressTrackSmall}>
                    <div 
                      style={{
                        ...styles.progressFill,
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: getProgressColor(pct)
                      }} 
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {data.recent_receipts.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Recent</h2>
          <div style={styles.recentList}>
            {data.recent_receipts.slice(0, 5).map(r => (
              <div key={r.id} style={styles.recentItem}>
                <div style={styles.recentLeft}>
                  <span style={styles.recentMerchant}>{r.merchant_name || 'Unknown'}</span>
                  <span style={styles.recentCategory}>{r.category?.name || 'Uncategorized'}</span>
                </div>
                <span style={styles.recentAmount}>${Number(r.grand_total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const dashStyles = {
  headerButtons: {
    display: 'flex',
    gap: 10,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'white',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  categoryButton: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s',
  },
  monthNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  monthBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748b',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1e293b',
    minWidth: 160,
    textAlign: 'center',
  },
};