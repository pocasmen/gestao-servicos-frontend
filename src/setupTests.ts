import '@testing-library/jest-dom'
import { vi } from 'vitest'

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock Supabase para evitar efeitos colaterais de canais e eventos
vi.mock('../supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      removeChannel: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));