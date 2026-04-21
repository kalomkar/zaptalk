import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Zap, Loader2, LogIn, Phone, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import PhoneInput from 'react-phone-number-input';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'selection' | 'phone'>('selection');
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const verifierRef = React.useRef<RecaptchaVerifier | null>(null);

  const cleanupRecaptcha = () => {
    if (verifierRef.current) {
      try {
        verifierRef.current.clear();
      } catch (e) {
        console.error('Error clearing recaptcha:', e);
      }
      verifierRef.current = null;
    }
    if ((window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupRecaptcha();
    };
  }, []);

  const setupRecaptcha = () => {
    try {
      // Forcefully cleanup any previous instances first
      cleanupRecaptcha();

      const container = document.getElementById('recaptcha-container');
      if (!container) return null;

      // Ensure the container is totally empty
      container.innerHTML = '';

      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          toast.error('Security check expired. Please try again.');
          cleanupRecaptcha();
        }
      });
      
      verifierRef.current = verifier;
      (window as any).recaptchaVerifier = verifier;
      return verifier;
    } catch (error) {
      console.error('reCAPTCHA Setup Error:', error);
      return null;
    }
  };

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return toast.error('Please enter a phone number');
    
    setLoading(true);
    setErrorDetails(null);

    // Safety timeout to reset loading state
    const timeoutId = setTimeout(() => {
      setLoading(current => {
        if (current) {
          toast.info('Taking longer than usual... please check your connection.');
          return false;
        }
        return current;
      });
    }, 20000);

    try {
      const appVerifier = setupRecaptcha();
      
      if (!appVerifier) {
        throw new Error('Security check initialization failed. Please refresh the page.');
      }

      console.log('Attempting to send OTP to:', phoneNumber);
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      clearTimeout(timeoutId);
      setConfirmationResult(result);
      setStep('otp');
      toast.success('OTP sent successfully!');
    } catch (error: any) {
      console.error('Phone Auth Error Detail:', error);
      clearTimeout(timeoutId);
      
      // Crucial: Clean up on error to allow retry
      cleanupRecaptcha();
      
      let msg = error.message || 'Error sending OTP';
      
      // Handle Firebase specific errors
      if (error.code === 'auth/unauthorized-domain') {
        msg = 'This website domain is not authorized in your Firebase Console. Add it to Authentication > Settings > Authorized Domains.';
        setErrorDetails(msg);
      } else if (error.code === 'auth/operation-not-allowed') {
        msg = 'Phone Login or India (+91) SMS is not allowed. In Firebase Console: 1. Authentication > Sign-in method > Enable Phone. 2. Settings > SMS Region Policy > Allow India.';
        setErrorDetails(msg);
      } else if (error.code === 'auth/invalid-phone-number') {
        msg = 'Invalid phone number format. Please ensure you selected the correct country.';
      } else if (error.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. To prevent abuse, Firebase has blocked requests from this number/IP temporarily.';
      } else if (msg.includes('captcha')) {
        msg = 'Security check failed. Please try opening the app in a new browser window/tab.';
      }
      
      toast.error(msg, { duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) return toast.error('Please enter the OTP');
    
    setLoading(true);

    const timeoutId = setTimeout(() => {
      setLoading(current => {
        if (current) {
          toast.error('Verification timed out. Please try again.');
          return false;
        }
        return current;
      });
    }, 15000);

    try {
      await confirmationResult.confirm(verificationCode);
      clearTimeout(timeoutId);
      toast.success('Successfully logged in!');
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('OTP Verification Error:', error);
      toast.error('Invalid OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-y-auto">
      <div id="recaptcha-container" className="fixed top-0 left-0"></div>
      
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-accent-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-accent-secondary rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm z-10 my-auto">
        <Card className="bg-sidebar border-sidebar-border text-foreground shadow-2xl overflow-hidden min-h-[450px] flex flex-col">
          {authMode === 'selection' ? (
            <div className="flex-1 flex flex-col p-6 pt-10">
              <div className="text-center space-y-4 mb-10">
                <div className="mx-auto w-16 h-16 bg-accent-primary/10 rounded-2xl flex items-center justify-center border border-accent-primary/20">
                  <Zap className="w-8 h-8 text-accent-primary" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">ZapTalk</h1>
                  <p className="text-sm text-text-dim">
                    Secure, real-time messaging
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 w-full flex-1 flex flex-col justify-center">
                <Button 
                  onClick={() => {
                    console.log('Mobile debug: Switching to phone mode');
                    setAuthMode('phone');
                  }}
                  className="w-full bg-accent-primary hover:bg-accent-primary/90 text-white font-bold h-14 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-accent-primary/20 text-lg"
                >
                  <Phone className="w-6 h-6" />
                  Continue with Phone
                </Button>

                <Button 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  variant="outline"
                  className="w-full bg-white hover:bg-zinc-100 text-zinc-950 font-bold h-14 rounded-2xl flex items-center justify-center gap-3 border-none text-lg"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google Login
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-8 border-t border-sidebar-border/30 mt-10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="text-[10px] text-text-dim leading-tight">Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent-primary" />
                  <span className="text-[10px] text-text-dim leading-tight">India Enabled</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 flex-1 flex flex-col h-full">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setAuthMode('selection'); setStep('phone'); }}
                className="mb-6 -ml-2 text-text-dim hover:text-foreground self-start"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
                
                <h3 className="text-xl font-bold mb-2">
                  {step === 'phone' ? 'What\'s your number?' : 'Verify Identity'}
                </h3>
                <p className="text-sm text-text-dim mb-6">
                  {step === 'phone' 
                    ? 'Enter your phone number to receive a verification code.' 
                    : `We sent a code to ${phoneNumber}`}
                </p>

                {step === 'phone' ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <PhoneInput
                        placeholder="Enter phone number"
                        value={phoneNumber}
                        onChange={setPhoneNumber}
                        defaultCountry="IN"
                        className="flex w-full"
                      />
                    </div>

                    {errorDetails && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex gap-3 text-[11px] text-rose-500 leading-relaxed"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p>{errorDetails}</p>
                      </motion.div>
                    )}

                    <Button 
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 rounded-xl bg-accent-primary flex items-center justify-center font-bold"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Sending OTP...
                        </>
                      ) : 'Continue'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Verification Code</Label>
                      <Input 
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="bg-sidebar-accent border-none h-14 rounded-2xl text-center text-2xl tracking-[0.2em] font-bold"
                      />
                    </div>
                    <Button 
                      type="submit"
                      disabled={loading}
                      className="w-full h-14 rounded-2xl bg-accent-primary flex items-center justify-center font-bold text-lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin mr-2" />
                          Verifying...
                        </>
                      ) : 'Verify & Login'}
                    </Button>
                    <p className="text-center text-xs text-text-dim">
                      Didn't receive it? <button type="button" onClick={handleSendOtp} className="text-accent-primary font-bold">Resend</button>
                    </p>
                  </form>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }
