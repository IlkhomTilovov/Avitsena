import { Route, Routes } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import Layout from "./layout/Layout";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Employees from "./pages/Employees";
import Receptions from "./pages/Receptions";
import RegisterLayout from "./layout/RegisterLayout";
import DoctorLayout from "./layout/DoctorLayout";
import SuperAdminLayout from "./layout/SuperAdminLayout";
import Clinics from "./pages/Clinics";
import TokenRefresher from "./components/tokenRefresh";
import PriviteRote from "./queries/PriviteRote";
import Registration from "./pages/Registration";
import PatientsInfo from "./components/PatientsInfo";
import Settings from "./pages/Settings";
import EmployeeInfo from "./components/EmployeeInfo";
import SettingDoctor from "./pages/SettingDoctor";

function App() {
  return (
    <div className="">
      <TokenRefresher />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="" element={<Layout />}>
          <Route
            path="/dashboard"
            element={
              <PriviteRote>
                <Dashboard />
              </PriviteRote>
            }
          />
          <Route
            path="/patients"
            element={
              <PriviteRote>
                <Patients />
              </PriviteRote>
            }
          />
          <Route
            path="/employees"
            element={
              <PriviteRote>
                <Employees />
              </PriviteRote>
            }
          />
          <Route
            path="/receptions"
            element={
              <PriviteRote>
                <Receptions />
              </PriviteRote>
            }
          />
          <Route
            path="/registration"
            element={
              <PriviteRote>
                <Registration />
              </PriviteRote>
            }
          />
          <Route
            path="patients/:id"
            element={
              <PriviteRote>
                <PatientsInfo />
              </PriviteRote>
            }
          />

          <Route
            path="employees/:id"
            element={
              <PriviteRote>
                <EmployeeInfo />
              </PriviteRote>
            }
          />
          <Route
            path="settings"
            element={
              <PriviteRote>
                <Settings />
              </PriviteRote>
            }
          />
        </Route>

        <Route
          path="register"
          element={
            <PriviteRote>
              <RegisterLayout />
            </PriviteRote>
          }
        >
          <Route
            path="registration"
            element={
              <PriviteRote>
                <Registration />
              </PriviteRote>
            }
          />
          <Route
            path="patients"
            element={
              <PriviteRote>
                <Patients />
              </PriviteRote>
            }
          />
          <Route
            path="patients/:id"
            element={
              <PriviteRote>
                <PatientsInfo />
              </PriviteRote>
            }
          />
          <Route
            path="settings"
            element={
              <PriviteRote>
                <Settings />
              </PriviteRote>
            }
          />
        </Route>
        <Route
          path="doctor"
          element={
            <PriviteRote>
              <DoctorLayout />
            </PriviteRote>
          }
        >
          <Route
            path="patients"
            element={
              <PriviteRote>
                <Patients />
              </PriviteRote>
            }
          />
          <Route
            path="settings"
            element={
              <PriviteRote>
                <SettingDoctor />
              </PriviteRote>
            }
          />
          <Route
            path="patients/:id"
            element={
              <PriviteRote>
                <PatientsInfo />
              </PriviteRote>
            }
          />
        </Route>
        <Route
          path="superadmin"
          element={
            <PriviteRote>
              <SuperAdminLayout />
            </PriviteRote>
          }
        >
          <Route
            path="clinics"
            element={
              <PriviteRote>
                <Clinics />
              </PriviteRote>
            }
          />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
