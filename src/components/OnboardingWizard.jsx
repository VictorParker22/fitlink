import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { IconCheck, IconChevronRight, IconDumbbell, IconClients, IconProfile } from './Icons';
import './OnboardingWizard.css';

const SPECIALIZATIONS = [
  'Weight Loss', 'Muscle Building', 'Strength Training', 'HIIT',
  'Yoga', 'CrossFit', 'Calisthenics', 'Boxing', 'Rehab & Mobility',
  'Senior Fitness', 'Sports Performance', 'Nutrition Coaching',
];

export default function OnboardingWizard({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Profile
  const [name, setName] = useState(user?.user_metadata?.name || '');
  const [bio, setBio] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState([]);

  // Step 2: Plan
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planPeriod, setPlanPeriod] = useState('month');

  // Step 3: Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const toggleSpec = (s) => {
    setSelectedSpecs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const steps = [
    { title: 'Your Profile', icon: <IconProfile size={20} />, description: 'Tell clients about yourself' },
    { title: 'First Plan', icon: <IconDumbbell size={20} />, description: 'Create a subscription tier' },
    { title: 'First Client', icon: <IconClients size={20} />, description: 'Invite someone to get started' },
  ];

  const handleSaveProfile = async () => {
    setLoading(true);
    await supabase.from('trainers').update({
      name: name.trim() || 'Coach',
      bio: bio.trim(),
      specializations: selectedSpecs,
    }).eq('id', user.id);
    setLoading(false);
    setStep(1);
  };

  const handleSavePlan = async () => {
    if (!planName.trim()) { setStep(2); return; } // Skip if empty
    setLoading(true);
    await supabase.from('plans').insert({
      trainer_id: user.id,
      name: planName.trim(),
      price: Number(planPrice) || 0,
      period: planPeriod,
      features: ['Personalized workouts', 'In-app messaging', 'Progress tracking'],
      color: '#FF5F3B',
    });
    setLoading(false);
    setStep(2);
  };

  const handleFinish = async () => {
    setLoading(true);

    // Add client if info provided
    if (inviteName.trim()) {
      await supabase.from('clients').insert({
        trainer_id: user.id,
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        status: 'trial',
      });
    }

    // Mark onboarding complete
    await supabase.from('trainers').update({
      onboarding_complete: true,
    }).eq('id', user.id);

    setLoading(false);
    onComplete();
  };

  const handleSkip = async () => {
    setLoading(true);
    await supabase.from('trainers').update({ onboarding_complete: true }).eq('id', user.id);
    setLoading(false);
    onComplete();
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        {/* Header */}
        <div className="ob-header">
          <h1 className="ob-title">Welcome to FitLink 🎉</h1>
          <p className="ob-subtitle">Let's set up your gym in 3 quick steps</p>
        </div>

        {/* Step indicators */}
        <div className="ob-steps">
          {steps.map((s, i) => (
            <div key={i} className={`ob-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="ob-step-dot">
                {i < step ? <IconCheck size={12} color="white" /> : <span>{i + 1}</span>}
              </div>
              <span className="ob-step-label">{s.title}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="ob-content">
          {step === 0 && (
            <div className="ob-step-content" key="step-0">
              <div className="ob-step-header">
                {steps[0].icon}
                <div>
                  <h2 className="heading-3">{steps[0].title}</h2>
                  <p className="text-small">{steps[0].description}</p>
                </div>
              </div>

              <div className="input-group mt-lg">
                <label className="input-label">Your Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Coach Mike" />
              </div>

              <div className="input-group mt-base">
                <label className="input-label">Bio (optional)</label>
                <textarea className="input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="10+ years helping clients transform their lives..." rows={3} style={{ resize: 'vertical' }} />
              </div>

              <div className="mt-base">
                <label className="input-label mb-sm">Specializations</label>
                <div className="ob-specs">
                  {SPECIALIZATIONS.map((s) => (
                    <button
                      key={s}
                      className={`ob-spec-chip ${selectedSpecs.includes(s) ? 'selected' : ''}`}
                      onClick={() => toggleSpec(s)}
                    >
                      {selectedSpecs.includes(s) && <IconCheck size={12} />} {s}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary btn-full btn-lg mt-xl" onClick={handleSaveProfile} disabled={loading}>
                {loading ? <span className="btn-spinner" /> : <>Continue <IconChevronRight size={16} /></>}
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="ob-step-content" key="step-1">
              <div className="ob-step-header">
                {steps[1].icon}
                <div>
                  <h2 className="heading-3">{steps[1].title}</h2>
                  <p className="text-small">{steps[1].description}</p>
                </div>
              </div>

              <div className="input-group mt-lg">
                <label className="input-label">Plan Name</label>
                <input className="input" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. Pro Training" />
              </div>

              <div className="flex-row gap-base mt-base">
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Price ($)</label>
                  <input className="input" type="number" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} placeholder="99" />
                </div>
                <div className="input-group" style={{ width: 120 }}>
                  <label className="input-label">Billing</label>
                  <select className="input" value={planPeriod} onChange={(e) => setPlanPeriod(e.target.value)}>
                    <option value="month">Monthly</option>
                    <option value="week">Weekly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="card mt-lg" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-small" style={{ color: 'var(--text-secondary)' }}>
                  💡 You can create more plans later. Most trainers start with one and add tiers as they grow.
                </p>
              </div>

              <div className="flex-row gap-base mt-xl">
                <button className="btn btn-secondary btn-lg flex-1" onClick={() => setStep(2)}>Skip</button>
                <button className="btn btn-primary btn-lg flex-1" onClick={handleSavePlan} disabled={loading}>
                  {loading ? <span className="btn-spinner" /> : <>Continue <IconChevronRight size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="ob-step-content" key="step-2">
              <div className="ob-step-header">
                {steps[2].icon}
                <div>
                  <h2 className="heading-3">{steps[2].title}</h2>
                  <p className="text-small">{steps[2].description}</p>
                </div>
              </div>

              <div className="input-group mt-lg">
                <label className="input-label">Client Name</label>
                <input className="input" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Sarah Johnson" />
              </div>

              <div className="input-group mt-base">
                <label className="input-label">Client Email (optional)</label>
                <input className="input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="sarah@email.com" />
              </div>

              <div className="card mt-lg" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-small" style={{ color: 'var(--text-secondary)' }}>
                  🚀 Your client can sign up at <strong style={{ color: 'var(--accent)' }}>/client/signup</strong> to access their workouts and chat with you.
                </p>
              </div>

              <button className="btn btn-primary btn-full btn-lg mt-xl" onClick={handleFinish} disabled={loading}>
                {loading ? <span className="btn-spinner" /> : inviteName.trim() ? 'Add Client & Start' : 'Skip & Start'}
              </button>
            </div>
          )}
        </div>

        {/* Skip link */}
        <button className="ob-skip" onClick={handleSkip}>
          Skip setup for now
        </button>
      </div>
    </div>
  );
}
