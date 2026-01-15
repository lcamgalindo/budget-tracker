import { useState } from 'react';
import { API_BASE } from '../api';
import { styles } from '../styles';
import { BackIcon } from '../components/Icons';

export default function CategoryEditScreen({ category, onBack, onSaved }) {
  const isNew = !category;
  const [name, setName] = useState(category?.name || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const generateSlug = (text) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a category name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const slug = generateSlug(name);
      
      if (isNew) {
        const res = await fetch(`${API_BASE}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, slug, sort_order: 50 }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Failed to create');
        }
      } else {
        const res = await fetch(`${API_BASE}/categories/${category.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('Failed to update');
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Deactivate "${category.name}"? Existing receipts will keep this category.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/categories/${category.id}`, { method: 'DELETE' });
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
        <h1 style={styles.headerTitle}>{isNew ? 'New Category' : 'Edit Category'}</h1>
        <div style={{ width: 20 }} />
      </header>

      <div style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Name</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Groceries, Entertainment"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button 
          style={styles.primaryBtn} 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? 'Saving...' : (isNew ? 'Create Category' : 'Save Changes')}
        </button>

        {!isNew && (
          <button 
            style={editStyles.deleteBtn} 
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Category'}
          </button>
        )}
      </div>
    </div>
  );
}

const editStyles = {
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