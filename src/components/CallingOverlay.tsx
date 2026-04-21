import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Volume2, User, Maximize2, Minimize2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCall } from '../context/CallContext';
import { cn } from '@/lib/utils';

export default function CallingOverlay() {
  const { 
    isReceivingCall, 
    isCallAccepted, 
    callData, 
    userStream, 
    remoteStream, 
    acceptCall, 
    refuseCall, 
    leaveCall,
    isVideoEnabled,
    setVideoEnabled,
    isAudioEnabled,
    setAudioEnabled
  } = useCall();

  const userVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (userVideoRef.current && userStream) {
      userVideoRef.current.srcObject = userStream;
    }
  }, [userStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!callData && !isReceivingCall) return null;

  return (
    <AnimatePresence>
      {(isReceivingCall || callData) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={cn(
            "fixed z-[100] transition-all duration-500 ease-in-out bg-zinc-950 text-white overflow-hidden shadow-2xl",
            isMinimized 
              ? "bottom-4 right-4 w-72 h-48 rounded-2xl border border-white/10" 
              : "inset-0 md:inset-10 md:rounded-3xl border-0 md:border md:border-white/10"
          )}
        >
          {/* Background Wallpaper/Blur */}
          <div className="absolute inset-0 z-0">
            <img 
              src={callData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${callData?.name}`} 
              className="w-full h-full object-cover blur-3xl opacity-20"
              alt="background"
            />
          </div>

          <div className="relative z-10 h-full flex flex-col">
            {/* Header */}
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold tracking-widest uppercase border border-emerald-500/30">
                  <Shield className="w-3 h-3" />
                  End-to-End Encrypted
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
              </Button>
            </div>

            {/* Main Call View */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
              {/* Remote Stream / Profile */}
              <div className="w-full h-full flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  {!isCallAccepted ? (
                    <motion.div 
                      key="ringing"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-6"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-accent-primary animate-ping opacity-20" />
                        <Avatar className="w-32 h-32 border-4 border-white/10 shadow-2xl">
                          <AvatarImage src={callData?.avatar} />
                          <AvatarFallback className="text-4xl bg-zinc-800">{callData?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="text-center">
                        <h2 className="text-3xl font-bold mb-2">{callData?.name}</h2>
                        <p className="text-accent-primary animate-pulse font-medium tracking-wide">
                          {isReceivingCall ? `Incoming ${callData?.video ? 'Video' : 'Voice'} Call...` : 'Calling...'}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="active"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full h-full relative"
                    >
                      {callData?.video ? (
                        <div className="w-full h-full rounded-2xl overflow-hidden bg-black shadow-inner">
                          <video 
                            ref={remoteVideoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover"
                          />
                          {!remoteStream && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/50 backdrop-blur-md">
                              <LoaderIcon className="w-10 h-10 animate-spin text-accent-primary mb-4" />
                              <p className="text-sm font-medium">Connecting video stream...</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-8">
                           <Avatar className="w-40 h-40 border-4 border-accent-primary/20 shadow-2xl">
                            <AvatarImage src={callData?.avatar} />
                            <AvatarFallback className="text-5xl bg-zinc-800">{callData?.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="text-center">
                            <h2 className="text-2xl font-bold">{callData?.name}</h2>
                            <p className="text-text-dim mt-2">Active Voice Call</p>
                            <CallTimer />
                          </div>
                        </div>
                      )}

                      {/* Small Local Preview */}
                      <div className="absolute top-4 right-4 w-32 h-44 rounded-xl border border-white/20 shadow-2xl overflow-hidden bg-zinc-900 z-50">
                        {isVideoEnabled ? (
                          <video 
                            ref={userVideoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover scale-x-[-1]"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                            <User className="w-10 h-10 text-white/20" />
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/50 backdrop-blur text-[8px] uppercase tracking-tighter rounded">
                          You
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Controls */}
            {!isMinimized && (
              <div className="p-10 flex items-center justify-center gap-6">
                {isReceivingCall && !isCallAccepted ? (
                  <>
                    <Button 
                      onClick={refuseCall}
                      size="icon" 
                      className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </Button>
                    <Button 
                      onClick={acceptCall}
                      size="icon" 
                      className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                    >
                      {callData?.video ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setAudioEnabled(!isAudioEnabled)}
                      className={cn(
                        "w-12 h-12 rounded-full border transition-all",
                        isAudioEnabled ? "border-white/10 hover:bg-white/10" : "bg-rose-500 border-transparent hover:bg-rose-600"
                      )}
                    >
                      {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </Button>

                    {callData?.video && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setVideoEnabled(!isVideoEnabled)}
                        className={cn(
                          "w-12 h-12 rounded-full border transition-all",
                          isVideoEnabled ? "border-white/10 hover:bg-white/10" : "bg-rose-500 border-transparent hover:bg-rose-600"
                        )}
                      >
                        {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                      </Button>
                    )}

                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="w-12 h-12 rounded-full border border-white/10 hover:bg-white/10"
                    >
                      <Volume2 className="w-5 h-5" />
                    </Button>

                    <Button 
                      onClick={leaveCall}
                      size="icon" 
                      className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CallTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <p className="text-accent-primary font-mono text-sm mt-1">{formatTime(seconds)}</p>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
