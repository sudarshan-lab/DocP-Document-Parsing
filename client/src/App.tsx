import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./components/login/Login";
import UserInformationPage from "./components/UserInformationPage/UserInformationPage";
import Announcement from "./components/announcements/Announcement";
function App() {
  return (
    <div className="App">

      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/contract" element={<Announcement />} />
          <Route path="/userInformationPage" element={<UserInformationPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;