import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import ClientsPage from './pages/ClientsPage';
import EquipmentsPage from './pages/EquipmentsPage';
import ReportsPage from './pages/ReportsPage';
import TechniciansPage from './pages/TechniciansPage';
import CalendarPage from './pages/CalendarPage';
import ReportPrintPage from './pages/ReportPrintPage'; // Importar a nova página

const App: React.FC = () => {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<ReportsPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/equipments" element={<EquipmentsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/technicians" element={<TechniciansPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/report/print/:id" element={<ReportPrintPage />} /> {/* Rota reativada */}
      </Routes>
    </Router>
  );
};

export default App;
