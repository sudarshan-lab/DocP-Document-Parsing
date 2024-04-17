import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import "./App.css";
import Dashboard from "./components/dashboard/Dashboard";
import UploadUsers from "./components/users-upload/UploadUsers";
import Announcement from "./components/announcements/Announcement";
import Login from "./components/login/Login";
import AdminDashboard from "./components/dashboard/AdminDashboard";
import History from "./components/history/History";
import UserInformationPage from "./components/UserInformationPage/UserInformationPage";
function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/contract" element={<Announcement />} />
          <Route path="/fileupload" element={<UploadUsers />} />
          <Route path="/userInformationPage" element={<UserInformationPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
