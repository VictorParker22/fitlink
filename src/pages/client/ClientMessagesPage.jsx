import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useClient } from './ClientContext';
import { notifyNewMessage } from '../../lib/notifications';
import Header from '../../components/Header';
import { IconSend } from '../../components/Icons';
import '../../pages/ChatPage.css';

export default function ClientMessagesPage() {
  const { user } = useAuth();
  const { conversation, trainer } = useClient();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!conversation) return;

    async function load() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    }
    load();
  }, [conversation]);

  // Realtime
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`client-messages:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        if (payload.new.sender_type === 'trainer') {
          notifyNewMessage(trainer?.name || 'Coach', payload.new.content);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [conversation, trainer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || sending || !conversation) return;

    setSending(true);
    setNewMessage('');

    try {
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_type: 'client',
        content,
      });

      await supabase.from('conversations').update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        unread_count: 1, // For trainer
      }).eq('id', conversation.id);
    } catch (err) {
      setNewMessage(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (!conversation) {
    return (
      <div className="page-content">
        <Header title="Messages" />
        <div className="empty-state mt-3xl">
          <p className="text-body">No conversation yet</p>
          <p className="text-small">Your trainer will start a conversation with you</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <Header title={`Coach ${(trainer?.name || '').split(' ')[0]}`} />

      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.sender_type === 'client' ? 'sent' : 'received'}`}
          >
            <p className="bubble-text">{msg.content}</p>
            <span className="bubble-time">{formatTime(msg.created_at)}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          ref={inputRef}
          className="chat-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!newMessage.trim() || sending}
        >
          <IconSend size={20} color={newMessage.trim() ? 'var(--accent)' : 'var(--text-tertiary)'} />
        </button>
      </form>
    </div>
  );
}
