// API service for OPORD operations

// Safe localStorage helper (same pattern as in auth.tsx)
const getLocalStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(key);
  }
  return null;
};

interface OPORDCreate {
  title: string;
  content: string;
  analysis_results?: any[];
}

interface OPORDUpdate {
  title?: string;
  content?: string;
  analysis_results?: any[];
}

export interface OPORD {
  id: number;
  title: string;
  content: string;
  analysis_results?: any[];
  user_id: number;
  created_at: string;
  updated_at: string | null;
}

interface TextForAnalysis {
  text: string;
}

export interface AnalysisResult {
  // Will hold tactical task analysis results
  task: string;
  position: {
    start: number;
    end: number;
  };
  definition: string;
  page_number: string;
  image_path?: string;
  id?: number; // ID of the tactical task
}

export interface TacticalTask {
  id: number;
  name: string;
  definition: string;
  page_number: string;
  source_reference: string;
  image_path?: string;
  related_figures?: string[];
}

interface AIEnhancementRequest {
  text: string;
  enhancement_type?: 'general' | 'conciseness' | 'clarity' | 'impact';
}

interface AIEnhancementResponse {
  original_text: string;
  enhanced_text: string;
}

// Base fetch function with authentication
const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = getLocalStorageItem('token');
  
  const headers = {
    ...(options.headers || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  
  // URL is now directly proxied to the backend at port 8000
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${response.status}`);
  }
  
  return response.json();
};

// OPORD API functions
export const opordApi = {
  getAll: async (skip = 0, limit = 100): Promise<OPORD[]> => {
    return apiFetch(`/opords/?skip=${skip}&limit=${limit}`);
  },
  
  getById: async (id: number): Promise<OPORD> => {
    return apiFetch(`/opords/${id}`);
  },
  
  create: async (data: OPORDCreate): Promise<OPORD> => {
    return apiFetch('/opords/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  },
  
  update: async (id: number, data: OPORDUpdate): Promise<OPORD> => {
    return apiFetch(`/opords/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  },
  
  delete: async (id: number): Promise<void> => {
    return apiFetch(`/opords/${id}`, {
      method: 'DELETE'
    });
  }
};

// Auth API functions 
export const authApi = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // API expects 'username' field even though we're using email
    formData.append('password', password);
    
    const response = await fetch('/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Authentication failed');
    }
    
    return response.json();
  },
  
  register: async (email: string, password: string) => {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Registration failed');
    }
    
    return response.json();
  }
};

// Tactical Analysis API functions
export const analysisApi = {
  analyzeTasks: async (text: string): Promise<AnalysisResult[]> => {
    return apiFetch('/analysis/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
  }
};

// AI Enhancement API functions
export const aiApi = {
  enhanceText: async (
    text: string, 
    enhancementType: 'general' | 'conciseness' | 'clarity' | 'impact' = 'general'
  ): Promise<AIEnhancementResponse> => {
    return apiFetch('/ai/enhance_text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        text, 
        enhancement_type: enhancementType 
      })
    });
  }
};

// Tactical Task API functions
export const tacticalTaskApi = {
  getAll: async (skip = 0, limit = 100): Promise<TacticalTask[]> => {
    return apiFetch(`/tactical-tasks/?skip=${skip}&limit=${limit}`);
  },
  
  getById: async (id: number): Promise<TacticalTask> => {
    return apiFetch(`/tactical-tasks/${id}`);
  }
}; 