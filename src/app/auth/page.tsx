'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '~/contexts/AuthContext';
import { LoginForm } from '~/components/auth/LoginForm';
import { SignupForm } from '~/components/auth/SignupForm';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Sparkles, Zap, Users, MessageSquare, Hash, AtSign, Smile, Command } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [guestUsername, setGuestUsername] = useState('');
  const [guestUsernameError, setGuestUsernameError] = useState('');
  const { user, loading, guestLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || guestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  function handleGuestClick() {
    setShowGuestDialog(true);
    setGuestUsername('');
    setGuestUsernameError('');
  }

  async function handleGuestLogin() {
    if (!guestUsername.trim()) {
      setGuestUsernameError('Please enter a username');
      return;
    }

    if (guestUsername.trim().length < 2) {
      setGuestUsernameError('Username must be at least 2 characters');
      return;
    }

    if (guestUsername.trim().length > 20) {
      setGuestUsernameError('Username must be less than 20 characters');
      return;
    }

    setGuestLoading(true);
    try {
      await guestLogin(guestUsername.trim());
      router.push('/');
    } finally {
      setGuestLoading(false);
      setShowGuestDialog(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-bg items-center justify-center p-12 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-soft"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-md space-y-8 text-white">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 backdrop-blur rounded-2xl">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">ever.chat</h1>
                <p className="text-purple-100">IRC vibes, modern feels</p>
              </div>
            </div>
          </div>

          <p className="text-lg text-purple-100 leading-relaxed">
            The chat platform that brings back the magic of IRC with a fresh coat of paint.
            Real-time conversations, slash commands, and all the emojis your heart desires.
          </p>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
                <Hash className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Channels like the good old days</p>
                <p className="text-sm text-purple-100">Join #general, #random, or create your own vibe</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
                <Command className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Slash commands ftw</p>
                <p className="text-sm text-purple-100">/giphy, /shrug, /tableflip - we got &apos;em all</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
                <Smile className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">React with everything</p>
                <p className="text-sm text-purple-100">Express yourself with reactions, GIFs, and custom emojis</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 pt-4">
            <Badge className="bg-white/20 backdrop-blur text-white border-white/30 px-3 py-1">
              <Zap className="h-3 w-3 mr-1" />
              Lightning fast
            </Badge>
            <Badge className="bg-white/20 backdrop-blur text-white border-white/30 px-3 py-1">
              <Users className="h-3 w-3 mr-1" />
              10k+ vibing
            </Badge>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center space-x-3">
              <div className="p-2 gradient-bg rounded-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text">ever.chat</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">IRC vibes, modern feels</p>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-bold">
              {isLogin ? 'Welcome back!' : 'Join the conversation'}
            </h2>
            <p className="text-muted-foreground">
              {isLogin ? 'Jump back into your channels' : 'Create your account in seconds'}
            </p>
          </div>

          {isLogin ? (
            <LoginForm onToggleMode={() => setIsLogin(false)} />
          ) : (
            <SignupForm onToggleMode={() => setIsLogin(true)} />
          )}

          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              onClick={handleGuestClick}
              variant="outline"
              className="w-full h-11 border-2 hover:border-purple-500 hover:text-purple-600 transition-all"
              disabled={guestLoading}
            >
              <AtSign className="h-4 w-4 mr-2" />
              Continue as @guest
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Guests can vibe but not type. Sign up to unlock full access.
            </p>
          </div>
        </div>
      </div>

      {/* Guest Username Dialog */}
      <Dialog open={showGuestDialog} onOpenChange={setShowGuestDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Choose Your Guest Username</DialogTitle>
            <DialogDescription>
              Pick a username for your guest session. You can always sign up later to keep your messages.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="guest-username">Username</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guest-username"
                  placeholder="your_username"
                  value={guestUsername}
                  onChange={(e) => {
                    setGuestUsername(e.target.value);
                    setGuestUsernameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGuestLogin();
                    }
                  }}
                  className="pl-9"
                  autoFocus
                />
              </div>
              {guestUsernameError && (
                <p className="text-sm text-destructive">{guestUsernameError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGuestDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGuestLogin}
              disabled={guestLoading}
              className="gradient-bg text-white"
            >
              {guestLoading ? 'Joining...' : 'Join as Guest'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}