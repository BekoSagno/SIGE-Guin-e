import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, User, Clock } from 'lucide-react';
import { etatEdgMessageService, authService } from '@common/services';

function EtatEdgMessaging({ onClose }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    loadConversations();
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await etatEdgMessageService.getConversations();
      setConversations(data.conversations || []);
      if (data.conversations && data.conversations.length > 0 && !selectedConversation) {
        setSelectedConversation(data.conversations[0]);
      }
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const wsUrl = `ws://localhost:5000/ws?token=${token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connecté pour messagerie');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          // Mettre à jour les conversations
          loadConversations();
        }
      };

      ws.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
      };

      ws.onclose = () => {
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Erreur connexion WebSocket:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const user = authService.getStoredUser();
      const recipientRole = user.role === 'ADMIN_ETAT' ? 'AGENT_EDG' : 'ADMIN_ETAT';

      await etatEdgMessageService.sendMessage({
        conversationId: selectedConversation.id,
        recipientRole,
        subject: selectedConversation.title,
        content: newMessage,
        messageType: 'MESSAGE',
      });

      setNewMessage('');
      await loadConversations();
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleStartNewConversation = async () => {
    const subject = prompt('Sujet de la conversation:');
    if (!subject) return;

    try {
      const user = authService.getStoredUser();
      const recipientRole = user.role === 'ADMIN_ETAT' ? 'AGENT_EDG' : 'ADMIN_ETAT';

      await etatEdgMessageService.sendMessage({
        recipientRole,
        subject,
        content: 'Début de la conversation',
        messageType: 'MESSAGE',
      });

      await loadConversations();
    } catch (error) {
      console.error('Erreur création conversation:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col animate-fade-in-scale">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Communication ÉTAT-EDG
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleStartNewConversation}
              className="btn-primary text-sm py-2 px-4"
            >
              Nouvelle conversation
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Liste des conversations */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune conversation</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      selectedConversation?.id === conv.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        {conv.title}
                      </p>
                      {conv.messages.some((m) => !m.read && m.senderRole !== authService.getStoredUser()?.role) && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {conv.messages.length > 0
                        ? conv.messages[conv.messages.length - 1].content.substring(0, 50) + '...'
                        : 'Aucun message'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {conv.messages.length} message{conv.messages.length > 1 ? 's' : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main - Messages */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {selectedConversation.messages.map((message) => {
                    const isOwn = message.senderRole === authService.getStoredUser()?.role;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-xl p-4 ${
                            isOwn
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="w-4 h-4" />
                            <span className="text-xs font-semibold">
                              {message.senderName || message.senderRole}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div className="flex items-center space-x-1 mt-2 text-xs opacity-70">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(message.createdAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Tapez votre message..."
                      className="input flex-1"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="btn-primary disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EtatEdgMessaging;
