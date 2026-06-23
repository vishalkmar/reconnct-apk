import React, { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import OtpScreen from './OtpScreen';
import { api } from '../../api/client';

// Two-step auth flow: email → OTP. The screen content/media is admin-controlled
// via /api/public/app-screen/login ("App Screens Control"); we fetch it once and
// hand it to both steps. Defaults render immediately if the fetch is slow.
export default function AuthNavigator() {
  const [step, setStep] = useState('login');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState(null);

  useEffect(() => {
    let alive = true;
    api.appScreen('login').then((d) => { if (alive) setContent(d.content); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (step === 'otp') {
    return <OtpScreen email={email} content={content} onBack={() => setStep('login')} />;
  }
  return <LoginScreen content={content} onOtpSent={(e) => { setEmail(e); setStep('otp'); }} />;
}
