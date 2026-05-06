import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { IconSearch, IconMessage } from '../components/Icons';
import { formatRelativeTime } from '../utils/helpers';
import './MessagesPage.css';

export default function MessagesPage() {
  const { user } = useAuth();
  const { clients } = useApp();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*, clients(name)')
      .order('last_message_at', { ascending: false });
    if (data) setConversations(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const startConversation = async (clientId) => {
    // Check if conversation exists
    const existing = conversations.find((c) => c.client_id === clientId);
    if (existing) {
      navigate(`/messages/${existing.id}`);
      return;
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({ trainer_id: user.id, client_id: clientId })
      .select()
      .single();
    if (!error && data) {
      navigate(`/messages/${data.id}`);
    }
  };

  const filtered = conversations.filter((c) => {
    const clientName = c.clients?.name || '';
    return clientName.toLowerCase().includes(search.toLowerCase());
  });

  // Clients without conversations
  const connectedClientIds = new Set(conversations.map((c) => c.client_id));
  const unconnectedClients = clients.filter((c) => !connectedClientIds.has(c.id) && c.status !== 'inactive');

  return (
    <div className="page-content messages-page">
      <Header title="Messages" />

      <div className="search-bar mt-lg">
        <IconSearch />
        <input
          className="input"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="message-search"
        />
      </div>

      {loading ? (
        <div className="flex-center mt-3xl">
          <div className="btn-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
        </div>
      ) : (
        <>
          {/* Active Conversations */}
          <div className="conversation-list mt-lg">
            {filtered.length === 0 && unconnectedClients.length === 0 && (
              <div className="empty-state">
                <IconMessage size={40} color="var(--text-tertiary)" />
                <p className="text-body">No messages yet</p>
                <p className="text-small">Start a conversation with a client</p>
              </div>
            )}
            {filtered.map((conv) => (
              <button
                key={conv.id}
                className="conv-item"
                onClick={() => navigate(`/messages/${conv.id}`)}
                id={`conv-${conv.id}`}
              >
                <Avatar name={conv.clients?.name || '?'} />
                <div className="conv-content">
                  <div className="flex-row flex-between">
                    <span className="conv-name">{conv.clients?.name || 'Unknown'}</span>
                    <span className="conv-time">{formatRelativeTime(conv.last_message_at)}</span>
                  </div>
                  <p className="conv-preview">{conv.last_message || 'Start chatting...'}</p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="conv-badge">{conv.unread_count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Quick Start with Unconnected Clients */}
          {unconnectedClients.length > 0 && (
            <>
              <div className="section-header mt-xl">
                <h3 className="heading-3">Start a conversation</h3>
              </div>
              <div className="quick-start-list">
                {unconnectedClients.slice(0, 5).map((client) => (
                  <button
                    key={client.id}
                    className="qs-item"
                    onClick={() => startConversation(client.id)}
                  >
                    <Avatar name={client.name} size="sm" />
                    <span className="qs-name">{client.name}</span>
                    <IconMessage size={16} color="var(--accent)" />
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
