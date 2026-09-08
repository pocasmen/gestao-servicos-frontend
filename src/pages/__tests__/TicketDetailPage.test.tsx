import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TicketDetailPage from '../TicketDetailPage';
import { AuthContext } from '../../contexts/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import apiClient from '../../apiClient';
import { supabase } from '../../supabase';

// Mock do apiClient
vi.mock('../../apiClient', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
    },
}));

// Mock do Supabase
vi.mock('../../supabase', () => ({
    supabase: {
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
        })),
        removeChannel: vi.fn(),
    },
}));

// Mock do useParams e useNavigate
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => ({ id: '1' }),
        useNavigate: () => vi.fn(),
    };
});

describe('TicketDetailPage - Realtime and Upload', () => {
    const mockUser = { id: 'admin-123', user_metadata: { role: 'admin' } };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should subscribe to realtime changes on mount', async () => {
        const mockTicket = {
            id: 1,
            title: 'Teste Realtime',
            faultDescription: 'Descrição',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            responses: [],
            attachments: []
        };

        (apiClient.get as any).mockResolvedValue({ data: mockTicket });

        render(
            <AuthContext.Provider value={{ user: mockUser, loading: false, setUser: vi.fn() } as any}>
                <BrowserRouter>
                    <TicketDetailPage />
                </BrowserRouter>
            </AuthContext.Provider>
        );

        await waitFor(() => {
            expect(apiClient.get).toHaveBeenCalledWith('/api/tickets/1');
        });

        // Verificar se o canal do supabase foi criado
        expect(supabase.channel).toHaveBeenCalledWith('ticket_1');
    });

    it('should refresh data when a realtime update occurs', async () => {
        const mockTicket = {
            id: 1,
            title: 'Teste Refresh',
            faultDescription: 'Desc',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            responses: [],
            attachments: []
        };

        (apiClient.get as any).mockResolvedValue({ data: mockTicket });

        let realtimeCallback: any;
        const mockChannel = {
            on: vi.fn((event, filter, callback) => {
                if (event === 'postgres_changes') {
                    realtimeCallback = callback;
                }
                return mockChannel;
            }),
            subscribe: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
        };

        (supabase.channel as any).mockReturnValue(mockChannel);

        render(
            <AuthContext.Provider value={{ user: mockUser, loading: false, setUser: vi.fn() } as any}>
                <BrowserRouter>
                    <TicketDetailPage />
                </BrowserRouter>
            </AuthContext.Provider>
        );

        // Primeira chamada no mount
        await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));

        // Simular evento realtime
        if (realtimeCallback) {
            realtimeCallback();
        }

        // Verificar se chamou o fetchTicketDetails novamente
        await waitFor(() => {
            expect(apiClient.get).toHaveBeenCalledTimes(2);
        });
    });
});
