import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const TextChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const interest = location.state?.interest || '';
  
  const [status, setStatus] = useState('Connecting...');
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [partnerId, setPartnerId] = useState(null);
  
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io(BACKEND_URL);

    socketRef.current.on('connect', () => {
      setStatus('Searching for a partner...');
      socketRef.current.emit('find_match', { type: 'text', interest });
    });

    socketRef.current.on('match_found', ({ partnerId }) => {
      setStatus('Connected with a stranger!');
      setPartnerId(partnerId);
      setMessages([]);
    });

    socketRef.current.on('receive_message', (msg) => {
      setMessages(prev => [...prev, { ...msg, isLocal: false }]);
    });

    socketRef.current.on('partner_disconnected', () => {
      setStatus('Partner disconnected. Searching...');
      setPartnerId(null);
      socketRef.current.emit('find_match', { type: 'text', interest });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [interest]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !partnerId) return;

    const msgData = { text: inputMsg, timestamp: new Date().toISOString() };
    socketRef.current.emit('send_message', { target: partnerId, ...msgData });
    setMessages(prev => [...prev, { ...msgData, isLocal: true }]);
    setInputMsg('');
  };

  const handleSkip = () => {
    setPartnerId(null);
    setStatus('Skipping... Searching for new partner...');
    socketRef.current.emit('skip');
  };

  const handleStop = () => {
    navigate('/');
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-100 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="font-bold text-lg">Text Chat</div>
          <div className="text-sm bg-gray-700 px-3 py-1 rounded-full">
            {status}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.isLocal ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-lg ${msg.isLocal ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {messages.length === 0 && partnerId && (
            <div className="text-center text-gray-400 mt-10">
              Say hello to your new friend!
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2 mb-4">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              disabled={!partnerId}
            />
            <button 
              type="submit" 
              disabled={!partnerId}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-bold"
            >
              Send
            </button>
          </form>
          
          <div className="flex gap-4">
            <button 
              onClick={handleStop}
              className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold hover:bg-red-600 transition"
            >
              STOP
            </button>
            <button 
              onClick={handleSkip}
              className="flex-1 bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-gray-900 transition"
            >
              SKIP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextChat;
