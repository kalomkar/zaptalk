import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'motion/react';
import { ShieldCheck, Zap, Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Welcome to ZapTalk!');
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-secondary rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-sidebar border-sidebar-border text-foreground shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-accent-primary/10 rounded-2xl flex items-center justify-center border border-accent-primary/20">
              <Zap className="w-8 h-8 text-accent-primary" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight">ZapTalk</CardTitle>
              <CardDescription className="text-text-dim">
                Secure, real-time messaging with Google Authentication
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Button 
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white hover:bg-zinc-100 text-zinc-950 font-semibold h-12 rounded-xl transition-all flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border/50">
                <ShieldCheck className="w-4 h-4 text-accent-primary" />
                <span className="text-[10px] font-medium">E2E Encrypted</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border/50">
                <Zap className="w-4 h-4 text-accent-secondary" />
                <span className="text-[10px] font-medium">Ultra Fast</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
