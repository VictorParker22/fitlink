import { useState } from 'react';
import { IconPhone, IconClients } from './Icons';

/**
 * ContactPicker — Reusable component that uses the Contact Picker API
 * (Chrome Android) with a graceful manual fallback for unsupported browsers.
 * 
 * Returns { name, phone, email } to onSelect callback.
 */
export default function ContactPicker({ onSelect, buttonLabel, buttonClass, compact = false }) {
  const [showManual, setShowManual] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');

  const isSupported = 'contacts' in navigator && 'ContactsManager' in window;

  const handlePickContact = async () => {
    if (!isSupported) {
      setShowManual(true);
      return;
    }

    try {
      const contacts = await navigator.contacts.select(
        ['name', 'tel', 'email'],
        { multiple: false }
      );

      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        onSelect({
          name: contact.name?.[0] || '',
          phone: contact.tel?.[0] || '',
          email: contact.email?.[0] || '',
        });
      }
    } catch (err) {
      // User cancelled or API failed — show manual fallback
      if (err.name !== 'TypeError') {
        console.log('Contact picker cancelled');
        return;
      }
      setShowManual(true);
    }
  };

  const handleManualSubmit = () => {
    if (!manualPhone.trim()) return;
    onSelect({
      name: manualName.trim(),
      phone: manualPhone.trim(),
      email: '',
    });
    setShowManual(false);
    setManualPhone('');
    setManualName('');
  };

  if (showManual) {
    return (
      <div className="contact-picker-manual">
        <div className="contact-picker-manual-header">
          <p className="text-small" style={{ fontWeight: 600 }}>Enter contact details</p>
          <button
            type="button"
            className="text-accent text-small"
            style={{ fontWeight: 600 }}
            onClick={() => setShowManual(false)}
          >
            Cancel
          </button>
        </div>
        <div className="contact-picker-fields">
          <input
            className="input"
            type="text"
            placeholder="Name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            autoComplete="name"
          />
          <input
            className="input"
            type="tel"
            placeholder="Phone number"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            autoComplete="tel"
            autoFocus
          />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-full btn-sm"
          onClick={handleManualSubmit}
          disabled={!manualPhone.trim()}
        >
          Use This Contact
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={buttonClass || `btn btn-secondary ${compact ? 'btn-sm' : 'btn-full'} contact-picker-btn`}
      onClick={handlePickContact}
    >
      <IconClients size={compact ? 14 : 18} />
      {buttonLabel || (isSupported ? 'Pick from Contacts' : 'Enter Phone Number')}
    </button>
  );
}
