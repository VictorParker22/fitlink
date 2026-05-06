import { useState } from 'react';
import { IconX, IconCopy, IconMail, IconMessage, IconWhatsApp, IconQrCode, IconCheck, IconPhone } from './Icons';
import { useApp } from '../context/AppContext';
import ContactPicker from './ContactPicker';

export default function InviteModal({ onClose }) {
  const { trainer } = useApp();
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [showSmsPanel, setShowSmsPanel] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');

  const referralLink = `https://fitlink.coach/client/signup`;
  const defaultMessage = `Hey! 💪 I'm Coach ${trainer.name.split(' ')[0]} and I'd love to help you crush your fitness goals. Sign up for FitLink to get started: ${referralLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customMessage || defaultMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
      email: `mailto:?subject=Join me at FitLink!&body=${msg}`,
    };
    window.open(urls[platform], '_blank');
  };

  // SMS with optional phone number
  const handleSendSms = (phone) => {
    const msg = encodeURIComponent(customMessage || defaultMessage);
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : cleanPhone.length > 10 ? `+${cleanPhone}` : cleanPhone;
    window.open(`sms:${formattedPhone}?body=${msg}`, '_self');
  };

  // Contact picker selected a contact for SMS
  const handleContactForSms = (contact) => {
    if (contact.phone) {
      handleSendSms(contact.phone);
    } else {
      setSmsPhone('');
      setShowSmsPanel(true);
    }
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

        {/* Quick SMS Send */}
        {!showSmsPanel ? (
          <>
            {/* Direct SMS Action — Primary CTA */}
            <div className="invite-sms-cta">
              <div className="sms-cta-header">
                <div className="sms-cta-icon">
                  <IconMessage size={22} color="#3B82F6" />
                </div>
                <div>
                  <p style={{ fontWeight: 600 }}>Send SMS Invite</p>
                  <p className="text-small" style={{ color: 'var(--text-tertiary)' }}>Pick a contact or type a number</p>
                </div>
              </div>
              <div className="sms-cta-actions">
                <ContactPicker
                  onSelect={handleContactForSms}
                  buttonLabel="Pick Contact"
                  compact
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowSmsPanel(true)}
                  id="type-number-btn"
                >
                  <IconPhone size={14} />
                  Type Number
                </button>
              </div>
            </div>

            <div className="divider" />

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

            {/* Other Share Options */}
            <h3 className="heading-3 mb-base">Also share via</h3>
            <div className="share-buttons">
              <button className="share-btn" onClick={() => handleShare('whatsapp')} id="share-whatsapp">
                <div className="share-icon" style={{ background: 'rgba(37, 211, 102, 0.15)' }}>
                  <IconWhatsApp size={22} color="#25D366" />
                </div>
                <span>WhatsApp</span>
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
          </>
        ) : (
          /* SMS Panel — type a phone number */
          <div className="sms-panel">
            <div className="sms-panel-header">
              <p style={{ fontWeight: 600 }}>Send SMS Invite</p>
              <button
                type="button"
                className="text-accent text-small"
                style={{ fontWeight: 600 }}
                onClick={() => setShowSmsPanel(false)}
              >
                Back
              </button>
            </div>

            <div className="input-group mt-base">
              <label className="input-label">Phone Number</label>
              <input
                className="input"
                type="tel"
                placeholder="(555) 123-4567"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                autoFocus
                autoComplete="tel"
                id="sms-phone-input"
              />
            </div>

            <div className="sms-preview mt-base">
              <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>Message Preview</label>
              <div className="sms-preview-bubble">
                <p className="text-small">{customMessage || defaultMessage}</p>
              </div>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg mt-lg"
              onClick={() => handleSendSms(smsPhone)}
              disabled={!smsPhone.trim()}
              id="send-sms-button"
            >
              <IconMessage size={18} />
              Open SMS
            </button>
          </div>
        )}
      </div>

      <style>{`
        .invite-link-box {
          background: var(--bg-input);
          border-radius: var(--radius-md);
          padding: var(--space-base);
        }
        .share-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
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
        .invite-sms-cta {
          background: var(--bg-card);
          border: var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-base);
        }
        .sms-cta-header {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-base);
        }
        .sms-cta-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: rgba(59, 130, 246, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sms-cta-actions {
          display: flex;
          gap: var(--space-sm);
        }
        .sms-cta-actions .btn {
          flex: 1;
        }
        .sms-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sms-preview-bubble {
          background: var(--bg-elevated);
          border: var(--border);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          color: var(--text-secondary);
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
