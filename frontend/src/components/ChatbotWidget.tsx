import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'bot' | 'user', text: string}[]>([
    { role: 'bot', text: 'Hello! I can help you check the status of your grievance or lodge a new one. What would you like to do?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userText = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      // Basic intent logic for MVP
      const lowerInput = userText.toLowerCase();
      
      if (lowerInput.includes('status') || lowerInput.includes('check')) {
        // Status check intent
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setMessages(prev => [...prev, { role: 'bot', text: 'Please log in to check your grievance status.' }]);
        } else {
          const { data } = await supabase
            .from('grievances')
            .select('raw_text, status')
            .eq('citizen_id', sessionData.session.user.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (data && data.length > 0) {
            setMessages(prev => [...prev, { role: 'bot', text: `Your most recent grievance ("${data[0].raw_text.substring(0, 30)}...") is currently marked as: **${data[0].status}**.` }]);
          } else {
            setMessages(prev => [...prev, { role: 'bot', text: "I couldn't find any recent grievances under your account." }]);
          }
        }
      } else if (lowerInput.includes('lodge') || lowerInput.includes('report') || lowerInput.includes('new')) {
        // Lodge intent
        setMessages(prev => [...prev, { role: 'bot', text: "Please use the 'Report Issue' page to lodge a new grievance so you can upload photos and provide details." }]);
      } else {
        // Fallback
        setMessages(prev => [...prev, { role: 'bot', text: "I'm not sure how to help with that yet. Try asking 'What is my status?' or 'I want to lodge a complaint'." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I encountered an error connecting to the server." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover hover:scale-105 transition-all z-40 ${isOpen ? 'hidden' : 'block'}`}
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden"
            style={{ height: '500px' }}
          >
            {/* Header */}
            <div className="bg-primary p-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span className="font-semibold">Citizen Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-500 border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex space-x-1 items-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 py-2 px-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-2 bg-primary text-white rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
