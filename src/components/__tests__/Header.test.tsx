import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../Header';
import { AuthContext } from '../../App';
import { vi, describe, it, expect } from 'vitest';

describe('Header Component', () => {
    const renderHeader = (user: any) => {
        return render(
            <AuthContext.Provider value={{ user, loading: false, setUser: vi.fn() } as any}>
                <BrowserRouter>
                    <Header />
                </BrowserRouter>
            </AuthContext.Provider>
        );
    };

    it('should render the brand link', () => {
        renderHeader(null);
        expect(screen.getByText(/Gestão de Serviços/i)).toBeInTheDocument();
    });

    it('should show login button when user is not logged in', () => {
        renderHeader(null);
        expect(screen.getByText(/Login/i)).toBeInTheDocument();
    });

    it('should show internal links for admin user', () => {
        const adminUser = {
            user_metadata: { role: 'admin', first_name: 'Admin', last_name: 'User' },
            email: 'admin@test.com'
        };
        renderHeader(adminUser);

        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/Calendário/i)).toBeInTheDocument();
        expect(screen.getByText(/Equipamentos/i)).toBeInTheDocument();
        expect(screen.getByText(/Utilizadores/i)).toBeInTheDocument(); // Admin only
    });

    it('should show dashboard link but NOT user management for technician', () => {
        const techUser = {
            user_metadata: { role: 'technician', first_name: 'Tech', last_name: 'User' },
            email: 'tech@test.com'
        };
        renderHeader(techUser);

        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
        expect(screen.queryByText(/Utilizadores/i)).not.toBeInTheDocument(); // Admin only
    });

    it('should not show internal links for client user', () => {
        const clientUser = {
            user_metadata: { role: 'client' },
            email: 'client@test.com'
        };
        renderHeader(clientUser);

        expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Calendário/i)).not.toBeInTheDocument();
    });
});
