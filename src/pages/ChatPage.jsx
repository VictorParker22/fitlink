import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { notifyNewMessage } from '../lib/notifications';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { IconSend } from '../components/Icons';
import './ChatPage.css';

export default function ChatPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [clientName, setClientName] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch conversation info + messages
  useEffect(() => {
    async function load() {
      // Get conversation with client name
      const { data: conv } = await supabase
        .from('conversations')
        .select('*, clients(name)')
        .eq('id', conversationId)
        .single();
      if (conv) {
        setConversation(conv);
        setClientName(conv.clients?.name || 'Client');
      }

      // Get messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (msgs) setMessages(msgs);

      // Mark as read
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'client')
        .eq('read', false);
    }
    load();
  }, [conversationId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          // Notify if message is from client
          if (payload.new.sender_type === 'client') {
            notifyNewMessage(clientName, payload.new.content);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || sending) return;

    setSending(true);
    setNewMessage('');

    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'trainer',
        content,
      });

      // Update conversation preview
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    } catch (err) {
      console.error('Send failed:', err);
      setNewMessage(content); // Restore on error
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDateDivider = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    if (!acc.length || acc[acc.length - 1].dateKey !== dateKey) {
      acc.push({ dateKey, date: msg.created_at, messages: [msg] });
    } else {
      acc[acc.length - 1].messages.push(msg);
    }
    return acc;
  }, []);

  return (
    <div className="chat-page">
      <Header title={clientName} showBack />

      <div className="chat-messages">
        {groupedMessages.map((group) => (
          <div key={group.dateKey}>
            <div className="chat-date-divider">
              <span>{formatDateDivider(group.date)}</span>
            </div>
            {group.messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble ${msg.sender_type === 'trainer' ? 'sent' : 'received'}`}
              >
                <p className="bubble-text">{msg.content}</p>
                <span className="bubble-time">{formatTime(msg.created_at)}</span>
              </div>
            ))}
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
          id="chat-message-input"
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!newMessage.trim() || sending}
          id="chat-send-btn"
        >
          <IconSend size={20} color={newMessage.trim() ? 'var(--accent)' : 'var(--text-tertiary)'} />
        </button>
      </form>
    </div>
  );
}
