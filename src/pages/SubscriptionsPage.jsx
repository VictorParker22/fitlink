import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { IconCheck, IconStar } from '../components/Icons';
import { formatCurrency } from '../utils/helpers';
import './SubscriptionsPage.css';

export default function SubscriptionsPage() {
  const { plans, clients } = useApp();

  // Count subscribers per plan from live client data
  const getSubscriberCount = (planId) => clients.filter((c) => c.plan_id === planId && c.status !== 'inactive').length;

  const totalRevenue = plans.reduce((sum, p) => sum + Number(p.price) * getSubscriberCount(p.id), 0);
  const totalSubscribers = plans.reduce((sum, p) => sum + getSubscriberCount(p.id), 0);

  return (
    <div className="page-content subscriptions-page">
      <Header title="Subscriptions" subtitle={`${totalSubscribers} active subscribers`} showBack />

      {/* Revenue Summary */}
      <div className="card revenue-summary mt-lg">
        <div className="flex-row flex-between">
          <div>
            <p className="text-small">Monthly Recurring Revenue</p>
            <h2 className="heading-1">{formatCurrency(totalRevenue)}</h2>
          </div>
          <div className="revenue-badge">
            <span className="text-small" style={{ color: 'var(--green)' }}>↑ 12%</span>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="section-header mt-xl">
        <h2>Your Plans</h2>
        <button className="btn btn-outline btn-sm">+ New Plan</button>
      </div>

      <div className="plans-list">
        {plans.map((plan, i) => {
          const subCount = getSubscriberCount(plan.id);
          const planClients = clients.filter((c) => c.plan_id === plan.id);
          return (
            <div
              className={`card plan-card stagger-item ${plan.is_popular ? 'plan-popular' : ''}`}
              key={plan.id}
              style={{ animationDelay: `${i * 80}ms`, '--plan-color': plan.color }}
            >
              {plan.is_popular && (
                <div className="popular-badge">
                  <IconStar size={12} color="white" /> Most Popular
                </div>
              )}
              <div className="plan-header">
                <h3 className="plan-name" style={{ color: plan.color }}>{plan.name}</h3>
                <div className="plan-price">
                  <span className="price-amount">{formatCurrency(Number(plan.price))}</span>
                  <span className="price-period">/{plan.period}</span>
                </div>
              </div>

              <div className="plan-subscribers">
                <div className="sub-avatars">
                  {planClients.slice(0, 3).map((c, j) => (
                    <div
                      key={c.id}
                      className="sub-avatar-ring"
                      style={{ marginLeft: j > 0 ? '-8px' : 0, zIndex: 3 - j }}
                    >
                      <div className="avatar avatar-sm" style={{ background: `hsl(${c.name.charCodeAt(0) * 5}, 70%, 60%)`, fontSize: '10px' }}>
                        {c.name.charAt(0)}
                      </div>
                    </div>
                  ))}
                </div>
                <span className="text-small">{subCount} subscribers</span>
              </div>

              <div className="divider" />

              <ul className="plan-features-list">
                {(plan.features || []).map((f, j) => (
                  <li key={j} className="plan-feature-item">
                    <IconCheck size={14} color={plan.color} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="plan-revenue">
                <span className="text-small">Monthly revenue</span>
                <span className="plan-revenue-val" style={{ color: plan.color }}>
                  {formatCurrency(Number(plan.price) * subCount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Breakdown */}
      <div className="section-header mt-xl">
        <h2>Revenue Breakdown</h2>
      </div>
      <div className="card">
        {plans.map((plan) => {
          const revenue = Number(plan.price) * getSubscriberCount(plan.id);
          const percent = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
          return (
            <div className="breakdown-row" key={plan.id}>
              <div className="flex-row gap-md flex-1">
                <div className="bd-color" style={{ background: plan.color }} />
                <span className="bd-name">{plan.name}</span>
              </div>
              <div className="flex-col gap-xs" style={{ alignItems: 'flex-end', minWidth: 80 }}>
                <span className="bd-amount">{formatCurrency(revenue)}</span>
                <div className="bd-bar-track">
                  <div className="bd-bar-fill" style={{ width: `${percent}%`, background: plan.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
