import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Landing from "./pages/Landing";
import Overview from "./pages/Overview";
import Documents from "./pages/Documents";
import Tables from "./pages/Tables";
import Settings from "./pages/Settings";
import FilePage from "./pages/FilePage";
import FolderPage from "./pages/FolderPage";
import { isAuthed } from "./auth";

function Protected({ children }: { children: JSX.Element }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

// Visitors see the landing page at "/"; signed-in users get their dashboard.
function Home() {
  return isAuthed() ? <Overview /> : <Landing />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Home />} />
        <Route path="/documents" element={<Protected><Documents /></Protected>} />
        <Route path="/tables" element={<Protected><Tables /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/files/:id" element={<Protected><FilePage /></Protected>} />
        <Route path="/folders/:id" element={<Protected><FolderPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
