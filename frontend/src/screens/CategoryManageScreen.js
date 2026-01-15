import { useState, useEffect } from 'react';
import { getCategories } from '../api';
import { styles } from '../styles';
import { BackIcon, PlusIcon, Spinner } from '../components/Icons';

export default function CategoryManageScreen({ onBack, onEdit }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(data => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    getCategories()
      .then(data => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{...styles.screen, ...styles.centered}}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <BackIcon />
        </button>
        <h1 style={styles.headerTitle}>Categories</h1>
        <button style={manageStyles.addBtn} onClick={() => onEdit(null)}>
          <PlusIcon size={20} />
        </button>
      </header>

      <div style={manageStyles.list}>
        {categories.filter(c => c.is_active).map(cat => (
          <div key={cat.id} style={manageStyles.item}>
            <button 
              style={manageStyles.itemContent}
              onClick={() => onEdit(cat)}
            >
              <span style={manageStyles.name}>{cat.name}</span>
              <span style={manageStyles.chevron}>›</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const manageStyles = {
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  item: {
    backgroundColor: 'white',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  itemContent: {
    width: '100%',
    padding: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  name: {
    fontSize: 15,
    fontWeight: 500,
    color: '#1e293b',
  },
  chevron: {
    fontSize: 20,
    color: '#94a3b8',
  },
};