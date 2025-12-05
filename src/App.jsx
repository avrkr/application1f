import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function App() {
  const [remoteStreams, setRemoteStreams] = useState({});
  const [status, setStatus] = useState('Initializing...');
  
  const socketRef = useRef();
  const peerConnections = useRef({});
  const localVideoRef = useRef();
  const localStreamRef = useRef();

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Get User Media
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setStatus('Connected to camera. Connecting to server...');

        // 2. Connect to Socket
        socketRef.current = io(BACKEND_URL);

        socketRef.current.on('connect', () => {
          setStatus('Connected to server. Joining room...');
          socketRef.current.emit('join_room', 'main-room');
        });

        // 3. Handle Socket Events
        socketRef.current.on('user_joined', (userId) => {
          console.log('User joined:', userId);
          createPeerConnection(userId, true);
        });

        socketRef.current.on('offer', async ({ sdp, caller }) => {
          console.log('Received offer from:', caller);
          const pc = createPeerConnection(caller, false);
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit('answer', { target: caller, sdp: answer });
        });

        socketRef.current.on('answer', async ({ sdp, responder }) => {
          console.log('Received answer from:', responder);
          const pc = peerConnections.current[responder];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          }
        });

        socketRef.current.on('ice_candidate', async ({ candidate, sender }) => {
          const pc = peerConnections.current[sender];
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });

      } catch (err) {
        console.error('Error initializing:', err);
        setStatus('Error: ' + err.message);
      }
    };

    init();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, []);

  const createPeerConnection = (userId, isInitiator) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.google.com:19302' }
      ]
    });

    peerConnections.current[userId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice_candidate', {
          target: userId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track from:', userId);
      setRemoteStreams(prev => ({
        ...prev,
        [userId]: event.streams[0]
      }));
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current.emit('offer', {
            target: userId,
            sdp: pc.localDescription
          });
        })
        .catch(err => console.error('Error creating offer:', err));
    }

    return pc;
  };

  return (
    <div className="App">
      <h1>Video Chat</h1>
      <p>Status: {status}</p>
      <div className="video-grid">
        <div className="video-container local">
          <h3>My Video</h3>
          <video ref={localVideoRef} autoPlay playsInline muted />
        </div>
        {Object.entries(remoteStreams).map(([userId, stream]) => (
          <div key={userId} className="video-container remote">
            <h3>User: {userId}</h3>
            <VideoPlayer stream={stream} />
          </div>
        ))}
      </div>
    </div>
  );
}

const VideoPlayer = ({ stream }) => {
  const videoRef = useRef();
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline />;
};

export default App;
