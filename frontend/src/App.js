import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import DoctorDashboard from "./components/DoctorDashboard";
import PatientProgram from './components/PatientProgram';
import PatientCard from './components/PatientCard';
import CreateCard from "./components/CreateCard";
import LevelFA from './components/LevelFA';
import LoadFile from "./components/LoadFile";
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route
            path="/doctor-dashboard"
            element={
                <DoctorDashboard />
            }
          />
          <Route
            path="/patient-program/:patientCode"
            element={
              <PatientProgram />
            }
          />
          <Route
            path="/patient-card/:patientCode"
            element={
              <PatientCard />
            }
          />
          <Route 
            path="/create-card" 
            element={
              <CreateCard />
            } 
          />
          <Route 
            path="/level-fa" 
            element={
              <LevelFA />
            } 
          />
          <Route 
            path="/load-file" 
            element={
              <LoadFile />
            } 
          />
      </Routes>
    </Router>
  );
}

export default App;