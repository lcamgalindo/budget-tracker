import { useState, useRef } from 'react';
import { uploadReceipt } from '../api';
import { styles } from '../styles';
import { BackIcon, PlusIcon, ImageIcon } from '../components/Icons';

export default function UploadScreen({ onSuccess, onManualEntry, onBack }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError(null);

    try {
      const data = await uploadReceipt(file);
      onSuccess(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      setPreview(null);
    }
  };

  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <BackIcon />
        </button>
        <h1 style={styles.headerTitle}>Add Expense</h1>
        <div style={{ width: 20 }} />
      </header>
      
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFile(e.target.files[0])}
        style={{ display: 'none' }}
      />

      {preview ? (
        <div style={styles.previewContainer}>
          <img src={preview} alt="Preview" style={styles.preview} />
          {uploading && (
            <div style={styles.uploadingOverlay}>
              <div style={styles.spinner} />
              <span>Processing receipt...</span>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.addOptions}>
          <button 
            style={styles.optionCard} 
            onClick={() => fileRef.current?.click()} 
            disabled={uploading}
          >
            <div style={styles.optionIcon}>
              <ImageIcon />
            </div>
            <span style={styles.optionTitle}>Scan Receipt</span>
            <span style={styles.optionDesc}>Take a photo or upload image</span>
          </button>
          
          <button style={styles.optionCard} onClick={onManualEntry}>
            <div style={styles.optionIcon}>
              <PlusIcon size={32} />
            </div>
            <span style={styles.optionTitle}>Manual Entry</span>
            <span style={styles.optionDesc}>Enter details yourself</span>
          </button>
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}