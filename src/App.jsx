import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import AccountLayout from './components/AccountLayout.jsx';
import Home from './pages/Home.jsx';
import CoinDetail from './pages/CoinDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Workers from './pages/Workers.jsx';
import Subaccounts from './pages/Subaccounts.jsx';
import Earnings from './pages/Earnings.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="coins/:symbol" element={<CoinDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="account" element={<AccountLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="workers" element={<Workers />} />
          <Route path="subaccounts" element={<Subaccounts />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
