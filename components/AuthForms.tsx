import React, { useState } from 'react';
import { loginUser, registerUser, checkEmailExists, sendVerificationCode, verifyUserOtp } from '../services/storageService';
import Input from './Input';
import Button from './Button';
import { User } from '../types';

interface AuthFormsProps {
  onLogin: (user: User) => void;
  toggleMode: () => void;
  isRegistering: boolean;
}

type AuthStep = 'EMAIL' | 'VERIFY' | 'DETAILS';

const AuthForms: React.FC<AuthFormsProps> = ({ onLogin, toggleMode, isRegistering }) => {
  const [step, setStep] = useState<AuthStep>('EMAIL');
  
  const [email, setEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [username, setUsername] = useState('');
  
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when switching modes
  const handleToggleMode = () => {
    setStep('EMAIL');
    setError('');
    setOtpInput('');
    setGeneratedOtp(null);
    toggleMode();
  };

  // Step 1: Send Code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !email.includes('@')) {
      setError('请输入有效的电子邮箱地址。');
      return;
    }

    setIsLoading(true);

    try {
      const emailExists = await checkEmailExists(email);

      if (isRegistering && emailExists) {
        setError('该邮箱已注册，请直接登录。');
        setIsLoading(false);
        return;
      }

      if (!isRegistering && !emailExists) {
        setError('该邮箱未注册，请先注册账号。');
        setIsLoading(false);
        return;
      }

      const code = await sendVerificationCode(email);
      setGeneratedOtp(code); // Store code (if local) or status flag
      setStep('VERIFY');
    } catch (err) {
      console.error(err);
      setError('连接错误或邮箱无效，请重试。');
    }
    setIsLoading(false);
  };

  // Step 2: Verify Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    let isValid = false;

    // Local/Admin Backdoor check
    if (generatedOtp && generatedOtp !== "SENT_VIA_EMAIL") {
       isValid = otpInput === generatedOtp;
    } else {
       // Real Supabase verification
       // Pass isRegistering to determine if we should verify as 'signup' or 'magiclink'
       isValid = await verifyUserOtp(email, otpInput, isRegistering);
    }

    if (!isValid) {
      setError('验证码无效或已过期，请重试。');
      setIsLoading(false);
      return;
    }

    // Code matches
    if (isRegistering) {
      setStep('DETAILS'); // Move to username entry
      setIsLoading(false);
    } else {
      // Login directly
      try {
        const result = await loginUser(email);
        if (result.success && result.user) {
          onLogin(result.user);
        } else {
          setError(result.message || '登录失败');
        }
      } catch (err) {
        setError('登录过程中发生错误。');
      }
      setIsLoading(false);
    }
  };

  // Step 3: Complete Registration (Only for Register mode)
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username.trim()) {
      setError('请输入用户名。');
      setIsLoading(false);
      return;
    }

    // New validation: Allow Alphanumeric + Underscore + Chinese characters
    const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
    if (!usernameRegex.test(username)) {
      setError('用户名只能包含字母、数字、中文和下划线，不能包含空格或特殊字符。');
      setIsLoading(false);
      return;
    }

    // Adjusted length check for Chinese names (e.g. "王伟" is 2 chars)
    if (username.length < 2 || username.length > 20) {
      setError('用户名长度需在 2 到 20 个字符之间。');
      setIsLoading(false);
      return;
    }

    try {
      const result = await registerUser(email, username);
      if (result.success) {
        // Auto login
        const loginResult = await loginUser(email);
        if (loginResult.success && loginResult.user) {
          onLogin(loginResult.user);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('注册失败。');
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-md mx-auto w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in-up mt-20">
      <div className="text-center mb-8 flex flex-col items-center">
        <img 
          src="/assets/ui/logo.png" 
          alt="Assetto Corsa Competizione" 
          className="h-16 w-auto object-contain mb-4"
        />
        <h2 className="text-xl font-bold text-white tracking-widest uppercase">Tracker<span className="text-red-500">Pro</span></h2>
        <p className="text-slate-400 mt-2">
          {isRegistering ? '创建车手档案' : '欢迎回来，车手'}
        </p>
      </div>

      {/* Step 1: Email Input */}
      {step === 'EMAIL' && (
        <form onSubmit={handleSendCode} className="space-y-6">
          <Input
            label="电子邮箱"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
          {error && <div className="text-red-500 text-sm text-center font-bold">{error}</div>}
          <Button type="submit" className="w-full py-3 text-lg" isLoading={isLoading}>
            {isLoading ? '发送中...' : '获取验证码'}
          </Button>
        </form>
      )}

      {/* Step 2: OTP Verification */}
      {step === 'VERIFY' && (
        <form onSubmit={handleVerifyCode} className="space-y-6 animate-fade-in">
          <div className="text-center text-slate-400 text-sm mb-4">
            我们已发送验证码至 <span className="text-white font-bold">{email}</span>
            {generatedOtp === "SENT_VIA_EMAIL" && <p className="text-xs text-slate-500 mt-1">(请检查垃圾邮件文件夹)</p>}
          </div>
          <Input
            label="验证码 / 密码"
            type="text"
            placeholder="12345678"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            className="text-center tracking-[0.2em] font-mono text-xl"
            maxLength={30}
            autoFocus
            disabled={isLoading}
          />
          {error && <div className="text-red-500 text-sm text-center font-bold">{error}</div>}
          <Button type="submit" className="w-full py-3 text-lg" isLoading={isLoading}>
            验证并{isRegistering ? '继续' : '登录'}
          </Button>
          <button 
            type="button" 
            onClick={() => setStep('EMAIL')}
            className="w-full text-slate-500 text-sm hover:text-white"
          >
            更换邮箱
          </button>
        </form>
      )}

      {/* Step 3: Username (Register Only) */}
      {step === 'DETAILS' && (
        <form onSubmit={handleCompleteRegistration} className="space-y-6 animate-fade-in">
          <div className="bg-green-900/20 border border-green-900/50 text-green-400 p-3 rounded text-center text-sm mb-4">
             ✓ 邮箱已验证
          </div>
          <Input
            label="车手昵称 (用户名)"
            placeholder="例如：MaxVerstappen33"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            disabled={isLoading}
            autoComplete="username"
          />
          <p className="text-xs text-slate-500 mt-1">
            * 支持中文、字母、数字和下划线
          </p>
          {error && <div className="text-red-500 text-sm text-center font-bold">{error}</div>}
          <Button type="submit" className="w-full py-3 text-lg" isLoading={isLoading}>
            完成注册
          </Button>
        </form>
      )}

      <div className="mt-6 text-center pt-6 border-t border-slate-700">
        <p className="text-slate-500 text-sm">
          {isRegistering ? "已有账号？" : "新加入比赛？"}{' '}
          <button onClick={handleToggleMode} className="text-red-500 hover:text-red-400 font-bold ml-1">
            {isRegistering ? '立即登录' : '立即注册'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthForms;