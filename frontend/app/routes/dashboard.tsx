import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from './+types/dashboard';
import { Navbar, MainLayout, Logo, Button, Card, CardHeader, CardTitle, CardContent, CardFooter } from '../lib/components';
import { useAuth } from '../lib/auth';
import { opordApi, type OPORD } from '../lib/api';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - OPORD Canvas" },
    { name: "description", content: "Your OPORD Canvas Dashboard" },
  ];
}

// Convert date string to formatted string
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export default function Dashboard() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [opords, setOpords] = useState<OPORD[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Fetch OPORDs
    fetchOpords();
  }, [isAuthenticated, navigate]);

  const fetchOpords = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await opordApi.getAll();
      setOpords(data);
    } catch (err) {
      console.error('Error fetching OPORDs:', err);
      setError('Failed to load OPORDs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOpord = () => {
    navigate('/opord/new');
  };

  const handleViewOpord = (id: number) => {
    navigate(`/opord/${id}`);
  };

  return (
    <>
      <Navbar>
        <Logo />
        <div className="flex items-center space-x-4">
          {user && (
            <span className="text-xs text-zinc-400">
              OPERATIVE: <span className="text-emerald-500">{user.email}</span>
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            LOG OUT
          </Button>
        </div>
      </Navbar>
      
      <MainLayout className="py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white">
            MISSION <span className="text-emerald-500">BRIEFINGS</span>
          </h1>
          
          <Button onClick={handleCreateOpord}>
            NEW OPORD
          </Button>
        </div>
        
        {error && (
          <div className="mb-6 p-3 border border-red-500/30 bg-red-500/10 text-red-400 rounded-sm">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-emerald-500 font-mono text-sm animate-pulse">
              LOADING MISSION DATA...
            </div>
          </div>
        ) : opords.length === 0 ? (
          <Card className="border-dashed bg-transparent">
            <CardContent className="py-12 text-center">
              <p className="text-zinc-500 mb-4">No OPORDs found. Create your first operation order.</p>
              <Button onClick={handleCreateOpord}>
                NEW OPORD
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opords.map((opord) => (
              <Card key={opord.id} className="hover:border-emerald-500/30 transition-colors duration-200">
                <CardHeader>
                  <CardTitle className="truncate">{opord.title}</CardTitle>
                </CardHeader>
                
                <CardContent>
                  <p className="text-zinc-400 truncate line-clamp-2">
                    {opord.content.substring(0, 100)}
                    {opord.content.length > 100 ? '...' : ''}
                  </p>
                </CardContent>
                
                <CardFooter className="justify-between text-xs text-zinc-500">
                  <div>
                    Created: {formatDate(opord.created_at)}
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleViewOpord(opord.id)}
                  >
                    VIEW OPORD
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </MainLayout>
    </>
  );
} 