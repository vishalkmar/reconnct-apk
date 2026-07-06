import React, { useState, useEffect } from 'react';
import { BackHandler } from 'react-native';
import LoginScreen from './LoginScreen';
import OtpScreen from './OtpScreen';
import OnboardingScreen from './OnboardingScreen';
import { useAuth } from '../../store/AuthContext';

// Auth flow: email → OTP → (first-time only) name+phone onboarding → app.
export default function AuthNavigator() {
  const [step, setStep] = useState('login');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(null); // { token, user } awaiting onboarding
  const { signIn } = useAuth();

  // System back: OTP → email; onboarding is a required step so back is blocked.
  useEffect(() => {
    const onBack = () => {
      if (step === 'otp') { setStep('login'); return true; }
      if (step === 'onboarding') return true;
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [step]);

  // After OTP verify: brand-new account → onboarding; returning user → straight in.
  const handleVerified = (data) => {
    if (data.needsProfile) { setPending({ token: data.token, user: data.user }); setStep('onboarding'); }
    else signIn(data.token, data.user);
  };

  if (step === 'onboarding' && pending) {
    return <OnboardingScreen email={email} token={pending.token} onDone={(user) => signIn(pending.token, user)} />;
  }
  if (step === 'otp') {
    return <OtpScreen email={email} onBack={() => setStep('login')} onVerified={handleVerified} />;
  }
  return <LoginScreen onOtpSent={(e) => { setEmail(e); setStep('otp'); }} />;
}
