import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import OTP from './pages/OTP';
import { authService } from '@common/services';
import { NotificationProvider } from './components/Notification';

function App() {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <NotificationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/otp" element={<OTP />} />
          <Route 
            path="/*" 
            element={isAuthenticated ? <Dashboard /> : <Login />} 
          />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;
