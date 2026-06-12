'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { useRouterStore } from '@/stores/useRouterStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score;
  };
  const strength = getStrength();
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-600'];

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < strength ? colors[strength - 1] : 'bg-neutral-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        Password strength: <span className="font-medium">{labels[strength - 1] || 'Too short'}</span>
      </p>
    </div>
  );
}

function LoginPage() {
  const { navigate } = useRouterStore();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('home');
    } catch {
      // Error handled by store
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif text-neutral-900 mb-2">Welcome Back</h1>
        <p className="text-neutral-500">Sign in to your account</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="pl-10"
              required
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => navigate('auth', { mode: 'forgot-password' })}
              className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          <Label htmlFor="remember" className="text-sm text-neutral-600">Remember me</Label>
        </div>
        <Button
          type="submit"
          className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <Separator className="my-6" />

      {/* Social Login (visual only) */}
      <div className="space-y-3">
        <Button variant="outline" className="w-full" type="button" disabled>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </Button>
        <Button variant="outline" className="w-full" type="button" disabled>
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Continue with Facebook
        </Button>
      </div>

      <p className="text-center text-sm text-neutral-500 mt-6">
        Don&apos;t have an account?{' '}
        <button
          onClick={() => navigate('auth', { mode: 'register' })}
          className="text-neutral-900 font-medium hover:underline"
        >
          Register
        </button>
      </p>
    </motion.div>
  );
}

function RegisterPage() {
  const { navigate } = useRouterStore();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }
    try {
      await register(name, email, password);
      toast.success('Account created successfully!');
      navigate('home');
    } catch {
      // Error handled by store
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif text-neutral-900 mb-2">Create Account</h1>
        <p className="text-neutral-500">Join us for an exclusive shopping experience</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <div className="relative mt-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="pl-10"
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="reg-email">Email</Label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="pl-10"
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="reg-password">Password</Label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10"
              required
            />
          </div>
          {confirmPassword && confirmPassword !== password && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="terms"
            checked={agreeTerms}
            onCheckedChange={(checked) => setAgreeTerms(checked === true)}
          />
          <Label htmlFor="terms" className="text-sm text-neutral-600">
            I agree to the Terms & Conditions
          </Label>
        </div>
        <Button
          type="submit"
          className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <p className="text-center text-sm text-neutral-500 mt-6">
        Already have an account?{' '}
        <button
          onClick={() => navigate('auth', { mode: 'login' })}
          className="text-neutral-900 font-medium hover:underline"
        >
          Sign In
        </button>
      </p>
    </motion.div>
  );
}

function ForgotPasswordPage() {
  const { navigate } = useRouterStore();
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch {
      // Error handled by store
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif text-neutral-900 mb-2">Forgot Password</h1>
        <p className="text-neutral-500">We&apos;ll send you a reset link</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {sent ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-neutral-600">We&apos;ve sent a password reset link to <strong>{email}</strong></p>
          <Button variant="outline" onClick={() => navigate('auth', { mode: 'login' })}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="forgot-email">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <button
            type="button"
            onClick={() => navigate('auth', { mode: 'login' })}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mx-auto transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
        </form>
      )}
    </motion.div>
  );
}

function ResetPasswordPage() {
  const { navigate } = useRouterStore();
  const { resetPassword, isLoading, error, clearError } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!token) {
      toast.error('Reset token is required');
      return;
    }
    try {
      await resetPassword(token, password);
      toast.success('Password reset successfully!');
      navigate('auth', { mode: 'login' });
    } catch {
      // Error handled by store
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif text-neutral-900 mb-2">Reset Password</h1>
        <p className="text-neutral-500">Enter your new password</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="reset-token">Reset Token</Label>
          <Input
            id="reset-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your reset token"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>
        <div>
          <Label htmlFor="reset-confirm">Confirm New Password</Label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              id="reset-confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10"
              required
            />
          </div>
        </div>
        <Button
          type="submit"
          className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
          disabled={isLoading}
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </motion.div>
  );
}

export default function AuthPages() {
  const { params } = useRouterStore();
  const mode = params.mode || 'login';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <AnimatePresence mode="wait">
        {mode === 'login' && <LoginPage key="login" />}
        {mode === 'register' && <RegisterPage key="register" />}
        {mode === 'forgot-password' && <ForgotPasswordPage key="forgot" />}
        {mode === 'reset-password' && <ResetPasswordPage key="reset" />}
      </AnimatePresence>
    </div>
  );
}
