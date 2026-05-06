import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import ClientCard from '../components/ClientCard';
import AddClientModal from '../components/AddClientModal';
import { IconSearch, IconPlus } from '../components/Icons';
import { staggerDelay } from '../utils/helpers';
import './ClientsPage.css';

export default function ClientsPage() {
  const { clients, plans, getPlanById } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddClient, setShowAddClient] = useState(false);

  const filtered = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: clients.length,
    active: clients.filter((c) => c.status === 'active').length,
    trial: clients.filter((c) => c.status === 'trial').length,
    inactive: clients.filter((c) => c.status === 'inactive').length,
  };

  return (
    <div className="page-content clients-page">
      <Header
        title="Clients"
        subtitle={`${counts.active} active · ${counts.trial} trial`}
      />

      {/* Search */}
      <div className="search-bar mt-lg">
        <IconSearch />
        <input
          className="input"
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="client-search"
        />
      </div>

      {/* Filter Tabs */}
      <div className="tabs mt-base">
        {['all', 'active', 'trial', 'inactive'].map((f) => (
          <button
            key={f}
            className={`tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
            id={`filter-${f}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Client List */}
      <div className="client-list mt-lg">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <IconSearch size={40} color="var(--text-tertiary)" />
            <p className="text-body">No clients found</p>
            <button className="btn btn-outline btn-sm" onClick={() => setShowAddClient(true)}>
              + Add your first client
            </button>
          </div>
        ) : (
          filtered.map((client, i) => (
            <ClientCard
              key={client.id}
              client={client}
              plan={getPlanById(client.plan_id)}
              delay={i * 50}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowAddClient(true)} id="add-client-fab">
        <IconPlus size={24} color="white" />
      </button>

      {showAddClient && <AddClientModal onClose={() => setShowAddClient(false)} />}
    </div>
  );
}
