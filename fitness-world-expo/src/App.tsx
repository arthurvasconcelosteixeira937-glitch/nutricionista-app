import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';

const ExpoPage = lazy(() => import('./expo/ExpoPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ApplyPage = lazy(() => import('./pages/ApplyPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const BrandPortal = lazy(() => import('./pages/brand/BrandPortal'));
const AdminPortal = lazy(() => import('./pages/admin/AdminPortal'));

function Loading() {
  return (
    <div className="grid h-full min-h-screen place-items-center bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-400/20 border-t-gold-400" />
        <p className="eyebrow">Carregando</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/feira" element={<ExpoPage />} />
        <Route path="/programacao" element={<SchedulePage />} />
        <Route path="/carrinho" element={<CheckoutPage />} />
        <Route path="/expor" element={<ApplyPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/empresa/*" element={<BrandPortal />} />
        <Route path="/admin/*" element={<AdminPortal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
