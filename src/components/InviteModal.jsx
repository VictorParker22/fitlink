import { useState } from 'react';
import { IconX, IconCopy, IconMail, IconMessage, IconWhatsApp, IconQrCode, IconCheck } from './Icons';
import { useApp } from '../context/AppContext';

export default function InviteModal({ onClose }) {
  const { trainer } = useApp();
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const referralLink = `https://fitlink.app/join/${trainer.referral_code}`;
  const defaultMessage = `Hey! 💪 I'm training with Coach ${trainer.name.split(' ')[0]} and it's been amazing. Join with my link and get your first session free: ${referralLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customMessage || defaultMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = customMessage || defaultMessage;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = (platform) => {
    const msg = encodeURIComponent(customMessage || defaultMessage);
    const urls = {
      whatsapp: `https://wa.me/?text=${msg}`,
      sms: `sms:?body=${msg}`,
      email: `mailto:?subject=Join me at FitLink!&body=${msg}`,
    };
    window.open(urls[platform], '_blank');
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} id="invite-modal">
      <div className="modal-sheet">
        <div className="modal-handle" />
        
        <div className="flex-row flex-between mb-lg">
          <h2 className="heading-2">Invite Client</h2>
          <button className="btn-icon btn-secondary" onClick={onClose} id="close-invite-modal">
            <IconX size={18} />
          </button>
        </div>

        {/* Referral Link */}
        <div className="invite-link-box">
          <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>Your Referral Link</label>
          <div className="flex-row gap-sm">
            <div className="input invite-link-input" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--fs-sm)' }}>
              {referralLink}
            </div>
            <button className={`btn ${copied ? 'btn-primary' : 'btn-secondary'}`} onClick={handleCopy} id="copy-link-button">
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="divider" />

        {/* Share Buttons */}
        <h3 className="heading-3 mb-base">Share via</h3>
        <div className="share-buttons">
          <button className="share-btn" onClick={() => handleShare('whatsapp')} id="share-whatsapp">
            <div className="share-icon" style={{ background: 'rgba(37, 211, 102, 0.15)' }}>
              <IconWhatsApp size={22} color="#25D366" />
            </div>
            <span>WhatsApp</span>
          </button>
          <button className="share-btn" onClick={() => handleShare('sms')} id="share-sms">
            <div className="share-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
              <IconMessage size={22} color="#3B82F6" />
            </div>
            <span>SMS</span>
          </button>
          <button className="share-btn" onClick={() => handleShare('email')} id="share-email">
            <div className="share-icon" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
              <IconMail size={22} color="#A855F7" />
            </div>
            <span>Email</span>
          </button>
          <button className="share-btn" id="share-qr">
            <div className="share-icon" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <IconQrCode size={22} color="var(--text-secondary)" />
            </div>
            <span>QR Code</span>
          </button>
        </div>

        <div className="divider" />

        {/* Custom Message */}
        <h3 className="heading-3 mb-base">Customize Message</h3>
        <textarea
          className="input"
          style={{ minHeight: '100px', resize: 'vertical', lineHeight: '1.5' }}
          placeholder={defaultMessage}
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          id="invite-custom-message"
        />

        <button className="btn btn-primary btn-full btn-lg mt-lg" onClick={handleCopy} id="send-invite-button">
          {copied ? '✓ Link Copied!' : 'Copy & Share Invite'}
        </button>
      </div>

      <style>{`
        .invite-link-box {
          background: var(--bg-input);
          border-radius: var(--radius-md);
          padding: var(--space-base);
        }
        .share-buttons {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
        }
        .share-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .share-btn span {
          font-size: var(--fs-xs);
          color: var(--text-secondary);
        }
        .share-icon {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--transition-fast);
        }
        .share-btn:active .share-icon {
          transform: scale(0.92);
        }
      `}</style>
    </div>
  );
}
