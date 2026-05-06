import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { IconX, IconCheck } from './Icons';

const CATEGORIES = [
  { id: 'front', label: 'Front', emoji: '🧍' },
  { id: 'side', label: 'Side', emoji: '🧍‍♂️' },
  { id: 'back', label: 'Back', emoji: '🔄' },
  { id: 'other', label: 'Other', emoji: '📷' },
];

/**
 * Compress an image file to max 800px wide and ~70% quality JPEG
 */
async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (maxWidth / w) * h;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function PhotoUploadModal({ clientId, trainerId, onClose, onUploaded }) {
  const [category, setCategory] = useState('front');
  const [takenAt, setTakenAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }

    setFile(selected);
    setError('');

    // Generate preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setUploadProgress(10);

    try {
      // Compress image
      setUploadProgress(20);
      const compressed = await compressImage(file);
      setUploadProgress(40);

      // Upload to Supabase Storage
      const timestamp = Date.now();
      const storagePath = `${trainerId}/${clientId}/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(storagePath, compressed, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      setUploadProgress(70);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(storagePath);

      setUploadProgress(85);

      // Save metadata to DB
      const { error: dbError } = await supabase
        .from('progress_photos')
        .insert({
          client_id: clientId,
          trainer_id: trainerId,
          photo_url: urlData.publicUrl,
          storage_path: storagePath,
          category,
          notes,
          taken_at: takenAt,
        });

      if (dbError) throw dbError;
      setUploadProgress(100);

      // Success — notify parent and close
      setTimeout(() => {
        onUploaded?.();
        onClose();
      }, 400);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed. Make sure the storage bucket exists.');
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex-row flex-between mb-lg">
          <h2 className="heading-2">Add Progress Photo</h2>
          <button className="btn btn-icon" onClick={onClose}>
            <IconX size={20} />
          </button>
        </div>

        {/* Photo picker */}
        <div
          className="photo-upload-zone"
          onClick={() => fileInputRef.current?.click()}
          style={preview ? { backgroundImage: `url(${preview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          {!preview && (
            <>
              <span style={{ fontSize: 36 }}>📸</span>
              <p className="text-body">Tap to select photo</p>
              <p className="text-small">JPG, PNG — max 10MB</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Category selector */}
        <p className="text-small mt-lg mb-sm" style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>POSE</p>
        <div className="photo-cat-row">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`photo-cat-btn ${category === c.id ? 'active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Date */}
        <p className="text-small mt-lg mb-sm" style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>DATE TAKEN</p>
        <input
          type="date"
          className="input"
          value={takenAt}
          onChange={(e) => setTakenAt(e.target.value)}
        />

        {/* Notes */}
        <p className="text-small mt-lg mb-sm" style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>NOTES (OPTIONAL)</p>
        <input
          className="input"
          placeholder="e.g. Week 4 check-in, 185 lbs"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Error */}
        {error && (
          <div className="auth-message error mt-base">{error}</div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="mt-base">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%`, background: 'var(--green)', transition: 'width 300ms ease' }}
              />
            </div>
            <p className="text-small mt-sm" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
              {uploadProgress < 40 ? 'Compressing...' : uploadProgress < 70 ? 'Uploading...' : uploadProgress < 100 ? 'Saving...' : '✓ Done!'}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          className="btn btn-primary btn-full btn-lg mt-lg"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? <span className="btn-spinner" /> : 'Upload Photo'}
        </button>

        <style>{`
          .photo-upload-zone {
            width: 100%;
            aspect-ratio: 3/4;
            max-height: 280px;
            border: 2px dashed rgba(255,255,255,0.1);
            border-radius: var(--radius-lg);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
            cursor: pointer;
            transition: border-color var(--transition);
            overflow: hidden;
          }
          .photo-upload-zone:hover { border-color: var(--accent); }
          .photo-cat-row {
            display: flex;
            gap: var(--space-sm);
          }
          .photo-cat-btn {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: var(--space-sm) var(--space-xs);
            background: var(--bg-elevated);
            border: 2px solid transparent;
            border-radius: var(--radius-md);
            font-size: var(--fs-xs);
            color: var(--text-secondary);
            transition: all var(--transition-fast);
          }
          .photo-cat-btn.active {
            border-color: var(--accent);
            color: var(--accent-text);
            background: rgba(255,95,59,0.08);
          }
        `}</style>
      </div>
    </div>
  );
}
