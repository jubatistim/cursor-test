import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IndexPage from './pages/index';
import RoomPage from './pages/room';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/room/:roomCode" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
