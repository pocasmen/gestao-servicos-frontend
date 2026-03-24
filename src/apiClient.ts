import axios from 'axios';
import logger from './utils/logger';
import { Report } from './types';
import { supabase } from './supabase'; // Importar o cliente Supabase

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
});

// Adicionar um interceptor para incluir o token do Supabase em cada pedido
apiClient.interceptors.request.use(
  async config => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const storedImpersonatedUser = sessionStorage.getItem('impersonatedUser');
    if (storedImpersonatedUser) {
      try {
        const parsed = JSON.parse(storedImpersonatedUser);
        if (parsed?.id) {
          config.headers['x-impersonate-user'] = parsed.id;
        }
      } catch (e) {
        // ignore parsing error
      }
    }

    if (config.url?.includes('/api/client-portal/my-') && !config.url.includes('companies')) {
      const savedClient = localStorage.getItem('activeClient');
      if (savedClient) {
        try {
          const client = JSON.parse(savedClient);
          if (client && client.id) {
            config.params = { ...config.params, clientId: client.id };
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

export const createReport = async (reportData: Report) => {
  const { technicians, ...rest } = reportData;
  const payload = {
    ...rest,
    technicianIds: technicians ? technicians.map(t => t.id) : [],
  };

  const response = await apiClient.post('/api/reports', payload);
  return response.data;
};

export const updateReport = async (id: number, reportData: Report) => {
  const { technicians, ...rest } = reportData;
  const payload = {
    ...rest,
    technicianIds: technicians ? technicians.map(t => t.id) : [],
  };

  const response = await apiClient.put(`/api/reports/${id}`, payload);
  return response.data;
};

export const searchPartByReference = async (reference: string) => {
  try {
    if (import.meta.env.DEV) {
      logger.debug({ reference }, '[DEBUG] Searching for part with reference');
    }
    const response = await apiClient.get(`/api/inventory/parts/${reference}`);
    if (import.meta.env.DEV) {
      logger.debug(response.data, '[DEBUG] Part found:');
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      if (import.meta.env.DEV) {
        logger.debug({ reference }, '[DEBUG] Part not found for reference');
      }
      return null; // Part not found
    }
    logger.error(error, '[ERROR] Error searching for part:');
    throw error;
  }
};

export const createPart = async (partData: { reference: string; designation: string }) => {
  const response = await apiClient.post('/api/inventory', partData);
  return response.data;
};

export const getTechnicians = async () => {
  const response = await apiClient.get('/api/technicians');
  return response.data;
};

export default apiClient;
