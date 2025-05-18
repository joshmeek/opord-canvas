import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from './+types/dashboard';
import { Navbar, MainLayout, Logo, Button, Card, CardHeader, CardTitle, CardContent, CardFooter, Input } from '../lib/components';
import { useAuth } from '../lib/auth';
import { useOpord } from '../lib/opord-context';
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
  const { createOpord } = useOpord();
  const navigate = useNavigate();
  const [opords, setOpords] = useState<OPORD[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [opordToDelete, setOpordToDelete] = useState<OPORD | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      
      // Show welcome message if user has no OPORDs
      if (data.length === 0) {
        setShowWelcome(true);
      }
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
  
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quickTitle) {
      return;
    }
    
    setIsCreating(true);
    
    try {
      const newOpord = await createOpord(quickTitle, '');
      await fetchOpords();
      setQuickTitle('');
      setShowQuickCreate(false);
      navigate(`/opord/${newOpord.id}`);
    } catch (err) {
      console.error('Error creating OPORD:', err);
      setError('Failed to create OPORD. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleConfirmDelete = (opord: OPORD) => {
    setOpordToDelete(opord);
    setShowDeleteConfirm(true);
  };
  
  const handleDeleteOpord = async () => {
    if (!opordToDelete) return;

    setIsLoading(true);
    setError(null);

    try {
      await opordApi.delete(opordToDelete.id);
      setOpords(opords.filter(opord => opord.id !== opordToDelete.id));
      
      // If last opord was deleted, show welcome screen again
      if (opords.length === 1) {
        setShowWelcome(true);
      }
    } catch (err) {
      console.error('Error deleting OPORD:', err);
      setError('Failed to delete OPORD. Please try again.');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
      setOpordToDelete(null);
    }
  };

  const renderEmptyState = () => (
    <Card className="border-dashed bg-transparent">
      <CardContent className="py-12 text-center">
        <p className="text-zinc-500 mb-4">Create your first operation order.</p>
        <Button onClick={handleCreateOpord}>
          Create OPORD
        </Button>
      </CardContent>
    </Card>
  );
  
  const renderQuickCreate = () => {
    if (!showQuickCreate) return null;
    
    return (
      <Card className="mb-6 border-emerald-500/30">
        <CardHeader>
          <CardTitle>Create New OPORD</CardTitle>
        </CardHeader>
        <form onSubmit={handleQuickCreate}>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1" htmlFor="quick-title">
                OPORD TITLE
              </label>
              <Input
                id="quick-title"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Enter mission title"
                disabled={isCreating}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              type="button"
              variant="ghost" 
              onClick={() => {
                setShowQuickCreate(false);
                if (opords.length === 0) setShowWelcome(true);
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !quickTitle}
            >
              {isCreating ? "Creating..." : "Create & Edit"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  };
  
  // Delete confirmation modal
  const renderDeleteConfirmation = () => {
    if (!showDeleteConfirm || !opordToDelete) return null;
    
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="mb-1 flex items-center">
            <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
          </div>
          
          <p className="text-zinc-400 mb-6 pl-8">
            This action cannot be undone. This will permanently delete the OPORD titled "<span className="text-emerald-400 font-medium">{opordToDelete.title}</span>".
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setOpordToDelete(null);
              }}
            >
              Cancel
            </Button>
            
            <Button
              className="bg-red-600 hover:bg-red-700 border-red-500"
              onClick={handleDeleteOpord}
            >
              Delete OPORD
            </Button>
          </div>
        </div>
      </div>
    );
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
          
          {!isLoading && (opords.length > 0 || showWelcome) && !showQuickCreate && (
             <Button onClick={() => {
                setShowQuickCreate(true);
                setShowWelcome(false);
             }}>
              NEW OPORD
            </Button>
          )}
          {showQuickCreate && (
            <Button variant="outline" onClick={() => {
              setShowQuickCreate(false);
              if(opords.length === 0) setShowWelcome(true);
            }}>
              CANCEL
            </Button>
          )}
        </div>
        
        {error && (
          <div className="mb-6 p-3 border border-red-500/30 bg-red-500/10 text-red-400 rounded-sm">
            {error}
          </div>
        )}
        
        {renderQuickCreate()}
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-emerald-500 font-mono text-sm animate-pulse">
              LOADING MISSION DATA...
            </div>
          </div>
        ) : opords.length === 0 && !showQuickCreate ? (
          renderEmptyState()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opords.map((opord) => (
              <Card key={opord.id} className="hover:border-emerald-500/30 transition-colors duration-200 flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <CardTitle className="truncate">{opord.title}</CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-zinc-400 truncate line-clamp-2 h-10">
                      {opord.content.substring(0, 100)}
                      {opord.content.length > 100 ? '...' : ''}
                    </p>
                  </CardContent>
                </div>
                
                <CardFooter className="justify-between text-xs text-zinc-500 border-t border-zinc-800 pt-3 mt-2">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="bg-red-600/30 hover:bg-red-600/50 text-red-200 border-red-700/30"
                      onClick={() => handleConfirmDelete(opord)}
                    >
                      Delete
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleViewOpord(opord.id)}
                    >
                      View OPORD
                    </Button>
                  </div>
                  <div className="text-right">
                    Created:<br/>{formatDate(opord.created_at)}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
        {renderDeleteConfirmation()}
      </MainLayout>
    </>
  );
} 