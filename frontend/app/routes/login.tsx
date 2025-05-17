import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from './+types/login';
import { MainLayout } from '../lib/components';
import { useAuth } from '../lib/auth';
import { Button, Card, CardHeader, CardTitle, CardContent, CardFooter, Input, Logo } from '../lib/components';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login - OPORD Canvas" },
    { name: "description", content: "Login to the OPORD Canvas Editor" },
  ];
}

export default function Login() {
  const navigate = useNavigate();
  const { login, error, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    
    if (!email || !password) {
      setValidationError('Please enter both email and password');
      return;
    }
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // Error is handled by the auth context
    }
  };

  return (
    <MainLayout className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        
        <Card className="relative overflow-hidden">
          {/* Decorative elements for cyberpunk aesthetic */}
          <div className="absolute top-0 right-0 w-32 h-1 bg-emerald-500/30"></div>
          <div className="absolute bottom-0 left-0 w-32 h-1 bg-emerald-500/30"></div>
          <div className="absolute top-0 left-0 w-1 h-32 bg-emerald-500/30"></div>
          <div className="absolute bottom-0 right-0 w-1 h-32 bg-emerald-500/30"></div>
          
          <CardHeader>
            <CardTitle className="text-center">AUTHENTICATION REQUIRED</CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1" htmlFor="email">
                  EMAIL
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operative@mil.gov"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1" htmlFor="password">
                  PASSWORD
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
              
              {(error || validationError) && (
                <div className="p-2 border border-red-500/20 bg-red-500/10 text-red-400 rounded-sm text-xs font-mono">
                  {validationError || error}
                </div>
              )}
            </form>
          </CardContent>
          
          <CardFooter className="flex-col space-y-4">
            <Button 
              className="w-full" 
              onClick={handleSubmit} 
              disabled={isLoading}
            >
              {isLoading ? "AUTHENTICATING..." : "ACCESS SYSTEM"}
            </Button>
            
            <div className="text-center text-xs text-zinc-500">
              <span>NEW OPERATIVE? </span>
              <button 
                className="text-emerald-500 hover:underline"
                onClick={() => navigate('/register')}
                type="button"
              >
                REGISTER CREDENTIALS
              </button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
} 