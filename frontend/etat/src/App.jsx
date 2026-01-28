import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { authService } from '@common/services';

function App() {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/*" 
          element={isAuthenticated ? <Dashboard /> : <Login />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
