import axios from 'axios';
import { Report } from './types';
import { supabase } from './supabase'; // Importar o cliente Supabase

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Adicionar um interceptor para incluir o token do Supabase em cada pedido
apiClient.interceptors.request.use(
  async config => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

export const createReport = async (reportData: Report) => {
  const payload = {
    ...reportData,
    technicianIds: reportData.technicians.map(t => t.id),
  };
  // @ts-ignore
  delete payload.technicians;

  const response = await apiClient.post('/api/reports', payload);
  return response.data;
};

export const updateReport = async (id: number, reportData: Report) => {
  const payload = {
    ...reportData,
    technicianIds: reportData.technicians.map(t => t.id),
  };
  // @ts-ignore
  delete payload.technicians;

  const response = await apiClient.put(`/api/reports/${id}`, payload);
  return response.data;
};

export const searchPartByReference = async (reference: string) => {
  try {
    console.log('[DEBUG] Searching for part with reference:', reference);
    const response = await apiClient.get(`/api/parts/${reference}`);
    console.log('[DEBUG] Part found:', response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log('[DEBUG] Part not found for reference:', reference);
      return null; // Part not found
    }
    console.error('[ERROR] Error searching for part:', error);
    throw error;
  }
};

export const createPart = async (partData: { reference: string; designation: string }) => {
  const response = await apiClient.post('/api/parts', partData);
  return response.data;
};

export const getTechnicians = async () => {
  const response = await apiClient.get('/api/technicians');
  return response.data;
};

export default apiClient;
