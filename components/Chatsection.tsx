import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CHAT } from '@/lib/constants'
import { Send } from 'lucide-react'

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: number;
}

const ChatSection = (address: string | undefined) => {
  const isConnected = !!address;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
  
    useEffect(() => {
      scrollToBottom();
    }, [messages]);
  

  const handleSendMessage = useCallback(() => {
      if (!inputMessage.trim() || !address) return;
  
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        user: address.slice(0, 6) + "..." + address.slice(-4),
        message: inputMessage.trim(),
        timestamp: Date.now(),
      };
  
      setMessages((prev) => {
        const updated = [...prev, newMessage];
        // Prevent memory leak by trimming old messages
        if (updated.length > CHAT.MAX_MESSAGES) {
          return updated.slice(-CHAT.MESSAGE_TRIM_COUNT);
        }
        return updated;
      });
      setInputMessage("");
    }, [inputMessage, address]);
  
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };

  return (
      <div className="flex flex-col p-4 h-[450px] flex-shrink-0">
        <p className="text-[#444] text-[12px] uppercase tracking-wider mb-2">Chat</p>
        <div className="flex-1 flex flex-col bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
            {messages.length === 0 ? (
              <p className="text-[#444] text-xs text-center py-4">No messages yet</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--accent-green)] text-[10px]">{msg.user}</span>
                    <span className="text-[#333] text-[10px]">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[var(--foreground)] text-xs">{msg.message}</p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[var(--card-bg)] p-2">
            {!isConnected ? (
              <p className="text-[#444] text-[10px] text-center py-1">Connect wallet to chat</p>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message..."
                  className="flex-1 bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded px-2 py-1.5 text-xs text-[var(--foreground)] placeholder-[#444] focus:outline-none focus:border-[#333]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className="bg-[var(--accent-green)] hover:bg-[var(--accent-green)] disabled:opacity-30 text-black p-1.5 rounded transition-colors"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
  )
}

export default ChatSection
