import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { RequireAdmin } from './components/RequireAdmin';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { CausesPage } from './pages/CausesPage';
import { CauseDetailPage } from './pages/CauseDetailPage';
import { NewCausePage } from './pages/NewCausePage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { NewUserPage } from './pages/NewUserPage';
import { AccountPage } from './pages/AccountPage';
import { LedgerPage } from './pages/LedgerPage';
import { DonationInterfacePage } from './pages/DonationInterfacePage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/causes" element={<CausesPage />} />
            <Route path="/causes/:id" element={<CauseDetailPage />} />
            <Route path="/donation-interface" element={<DonationInterfacePage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route
              path="/admin/users"
              element={
                <RequireAdmin>
                  <AdminUsersPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/users/new"
              element={
                <RequireAdmin>
                  <NewUserPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/causes/new"
              element={
                <RequireAdmin>
                  <NewCausePage />
                </RequireAdmin>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
