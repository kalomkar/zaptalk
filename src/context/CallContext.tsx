import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import { useUser } from './UserContext';
import { toast } from 'sonner';

interface CallData {
  from: string;
  name: string;
  avatar: string;
  offer: any;
  video: boolean;
}

interface CallContextType {
  isReceivingCall: boolean;
  isCallAccepted: boolean;
  isCallEnded: boolean;
  callData: CallData | null;
  userStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (targetUid: string, name: string, avatar: string, video?: boolean) => void;
  acceptCall: () => void;
  refuseCall: () => void;
  leaveCall: () => void;
  isVideoEnabled: boolean;
  setVideoEnabled: (enabled: boolean) => void;
  isAudioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, profile } = useUser();
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [callData, setCallData] = useState<CallData | null>(null);
  
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const [isVideoEnabled, setVideoEnabled] = useState(true);
  const [isAudioEnabled, setAudioEnabled] = useState(true);

  const connectionRef = useRef<any>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', (data: CallData) => {
      setIsReceivingCall(true);
      setCallData(data);
    });

    socket.on('ice-candidate', (candidate: any) => {
      // trickle: false means we don't need this, but for completeness
    });

    socket.on('call-refused', () => {
      toast.error('Call refused');
      leaveCall();
    });

    socket.on('call-ended', () => {
      leaveCall();
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-refused');
      socket.off('call-ended');
    };
  }, [socket]);

  const startCall = async (targetUid: string, name: string, avatar: string, video: boolean = false) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices API not available. Please ensure you are using HTTPS.');
      }

      let stream: MediaStream;
      try {
        // Try getting both video and audio
        stream = await navigator.mediaDevices.getUserMedia({ video: video, audio: true });
      } catch (err: any) {
        console.warn('Initial getUserMedia failed:', err.name);
        
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          if (video) {
            try {
              // Try audio only if camera is missing
              toast.info('Camera not found, trying audio only...');
              stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
              video = false;
            } catch (audioErr: any) {
              // If audio also fails, then no devices at all
              throw new Error('Neither camera nor microphone could be found.');
            }
          } else {
            throw new Error('Microphone not found. Please connect a microphone to make calls.');
          }
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error('Permission to access camera or microphone was denied. Please enable them in your browser settings.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          throw new Error('Camera or microphone is already in use by another application.');
        } else {
          throw err;
        }
      }

      setUserStream(stream);
      setVideoEnabled(video);

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream
      });

      peer.on('signal', (data) => {
        socket?.emit('call-user', {
          to: targetUid,
          from: profile?.uid,
          name: profile?.displayName,
          avatar: profile?.photoURL,
          offer: data,
          video: video
        });
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
      });

      socket?.on('call-accepted', (data: any) => {
        setIsCallAccepted(true);
        peer.signal(data.answer);
      });

      connectionRef.current = peer;
      setCallData({ from: targetUid, name, avatar, offer: null, video });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Could not access camera/microphone');
    }
  };

  const acceptCall = async () => {
    if (!callData) return;
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices API not available.');
      }

      let stream: MediaStream;
      let actualVideo = callData.video;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: actualVideo, audio: true });
      } catch (err: any) {
        console.warn('Accept call initial getUserMedia failed:', err.name);
        
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          if (actualVideo) {
            try {
              toast.info('Camera not found, accepting as audio call...');
              stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
              actualVideo = false;
            } catch (audioErr: any) {
              throw new Error('Neither camera nor microphone could be found.');
            }
          } else {
            throw new Error('Microphone not found. Please connect a microphone to receive calls.');
          }
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error('Permission denied. Please enable your camera/microphone in browser settings.');
        } else {
          throw err;
        }
      }

      setUserStream(stream);
      setVideoEnabled(actualVideo);
      setIsCallAccepted(true);

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream
      });

      peer.on('signal', (data) => {
        socket?.emit('accept-call', { to: callData.from, answer: data });
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
      });

      peer.signal(callData.offer);
      connectionRef.current = peer;
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Could not access camera/microphone');
      refuseCall();
    }
  };

  const refuseCall = () => {
    if (callData) {
      socket?.emit('refuse-call', { to: callData.from });
    }
    leaveCall();
  };

  const leaveCall = () => {
    if (callData) {
        socket?.emit('hangup', { to: callData.from });
    }

    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    
    if (userStream) {
      userStream.getTracks().forEach(track => track.stop());
    }
    
    setUserStream(null);
    setRemoteStream(null);
    setIsReceivingCall(false);
    setIsCallAccepted(false);
    setCallData(null);
    setIsCallEnded(false);
  };

  return (
    <CallContext.Provider value={{
      isReceivingCall,
      isCallAccepted,
      isCallEnded,
      callData,
      userStream,
      remoteStream,
      startCall,
      acceptCall,
      refuseCall,
      leaveCall,
      isVideoEnabled,
      setVideoEnabled,
      isAudioEnabled,
      setAudioEnabled
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};
