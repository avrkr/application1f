import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const VideoChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const interest = location.state?.interest || '';
  
  const [status, setStatus] = useState('Connecting...');
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [partnerId, setPartnerId] = useState(null);
  
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const socketRef = useRef();
  const peerConnection = useRef();
  const localStreamRef = useRef();

  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        socketRef.current = io(BACKEND_URL);

        socketRef.current.on('connect', () => {
          setStatus('Searching for a partner...');
          socketRef.current.emit('find_match', { type: 'video', interest });
        });

        socketRef.current.on('match_found', async ({ partnerId, initiator }) => {
          setStatus('Connected with a stranger!');
          setPartnerId(partnerId);
          setMessages([]); // Clear chat on new match
          createPeerConnection(partnerId, initiator);
        });

        socketRef.current.on('offer', async ({ sdp, caller }) => {
          if (!peerConnection.current) return;
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          socketRef.current.emit('answer', { target: caller, sdp: answer });
        });

        socketRef.current.on('answer', async ({ sdp }) => {
          if (peerConnection.current) {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));
          }
        });

        socketRef.current.on('ice_candidate', async ({ candidate }) => {
          if (peerConnection.current) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });

        socketRef.current.on('receive_message', (msg) => {
          setMessages(prev => [...prev, { ...msg, isLocal: false }]);
        });

        socketRef.current.on('partner_disconnected', () => {
          setStatus('Partner disconnected. Searching...');
          setPartnerId(null);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
          }
          socketRef.current.emit('find_match', { type: 'video', interest });
        });

      } catch (err) {
        console.error('Error:', err);
        setStatus('Error accessing camera/microphone');
      }
    };

    init();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) socketRef.current.disconnect();
      if (peerConnection.current) peerConnection.current.close();
    };
  }, [interest]);

  const createPeerConnection = (partnerId, isInitiator) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.google.com:19302' }]
    });
    peerConnection.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice_candidate', { target: partnerId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current.emit('offer', { target: partnerId, sdp: pc.localDescription });
        })
        .catch(err => console.error('Error creating offer:', err));
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !partnerId) return;

    const msgData = { text: inputMsg, timestamp: new Date().toISOString() };
    socketRef.current.emit('send_message', { target: partnerId, ...msgData });
    setMessages(prev => [...prev, { ...msgData, isLocal: true }]);
    setInputMsg('');
  };

  const handleSkip = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setPartnerId(null);
    setStatus('Skipping... Searching for new partner...');
    socketRef.current.emit('skip');
  };

  const handleStop = () => {
    navigate('/');
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-black flex flex-col md:flex-row overflow-hidden">
      {/* Left Side - Video Area */}
      <div className="w-full md:w-2/3 flex flex-col h-1/2 md:h-full border-r border-gray-800">
        {/* Partner Video (Top) */}
        <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-hidden">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
          {!partnerId && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>{status}</p>
              </div>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded text-white text-sm">Partner</div>
        </div>
        
        {/* Local Video (Bottom) */}
        <div className="h-1/3 md:h-1/3 bg-gray-800 relative border-t border-gray-700">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
          <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded text-white text-sm">You</div>
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="w-full md:w-1/3 flex flex-col h-1/2 md:h-full bg-white">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.isLocal ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${msg.isLocal ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2 mb-4">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              disabled={!partnerId}
            />
            <button 
              type="submit" 
              disabled={!partnerId}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </form>
          
          <div className="flex gap-2">
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

export default VideoChat;
