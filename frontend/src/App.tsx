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
import Services from "./pages/Services";
import EmployeeInfo from "./components/EmployeeInfo";
import SettingDoctor from "./pages/SettingDoctor";
import Moliya from "./pages/Moliya";
import Statsionar from "./pages/Statsionar";
import Ombor from "./pages/Ombor";
import SupportMessages from "./pages/SupportMessages";

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
              <PriviteRote roles={["admin"]}>
                <Dashboard />
              </PriviteRote>
            }
          />
          <Route
            path="/patients"
            element={
              <PriviteRote roles={["admin"]}>
                <Patients />
              </PriviteRote>
            }
          />
          <Route
            path="/employees"
            element={
              <PriviteRote roles={["admin"]}>
                <Employees />
              </PriviteRote>
            }
          />
          <Route
            path="/receptions"
            element={
              <PriviteRote roles={["admin"]}>
                <Receptions />
              </PriviteRote>
            }
          />
          <Route
            path="/registration"
            element={
              <PriviteRote roles={["admin"]}>
                <Registration />
              </PriviteRote>
            }
          />
          <Route
            path="patients/:id"
            element={
              <PriviteRote roles={["admin"]}>
                <PatientsInfo />
              </PriviteRote>
            }
          />

          <Route
            path="employees/:id"
            element={
              <PriviteRote roles={["admin"]}>
                <EmployeeInfo />
              </PriviteRote>
            }
          />
          <Route
            path="settings"
            element={
              <PriviteRote roles={["admin"]}>
                <Settings />
              </PriviteRote>
            }
          />
          <Route
            path="services"
            element={
              <PriviteRote roles={["admin"]}>
                <Services />
              </PriviteRote>
            }
          />
          <Route
            path="statsionar"
            element={
              <PriviteRote roles={["admin"]}>
                <Statsionar />
              </PriviteRote>
            }
          />
          <Route
            path="ombor"
            element={
              <PriviteRote roles={["admin"]}>
                <Ombor />
              </PriviteRote>
            }
          />
        </Route>

        <Route
          path="register"
          element={
            <PriviteRote roles={["registrator"]}>
              <RegisterLayout />
            </PriviteRote>
          }
        >
          <Route
            path="registration"
            element={
              <PriviteRote roles={["registrator"]}>
                <Registration />
              </PriviteRote>
            }
          />
          <Route
            path="patients"
            element={
              <PriviteRote roles={["registrator"]}>
                <Patients />
              </PriviteRote>
            }
          />
          <Route
            path="patients/:id"
            element={
              <PriviteRote roles={["registrator"]}>
                <PatientsInfo />
              </PriviteRote>
            }
          />
          <Route
            path="settings"
            element={
              <PriviteRote roles={["registrator"]}>
                <Settings />
              </PriviteRote>
            }
          />
          <Route
            path="statsionar"
            element={
              <PriviteRote roles={["registrator"]}>
                <Statsionar />
              </PriviteRote>
            }
          />
          <Route
            path="ombor"
            element={
              <PriviteRote roles={["registrator"]}>
                <Ombor />
              </PriviteRote>
            }
          />
        </Route>
        <Route
          path="doctor"
          element={
            <PriviteRote roles={["doctor"]}>
              <DoctorLayout />
            </PriviteRote>
          }
        >
          <Route
            path="patients"
            element={
              <PriviteRote roles={["doctor"]}>
                <Patients />
              </PriviteRote>
            }
          />
          <Route
            path="settings"
            element={
              <PriviteRote roles={["doctor"]}>
                <SettingDoctor />
              </PriviteRote>
            }
          />
          <Route
            path="patients/:id"
            element={
              <PriviteRote roles={["doctor"]}>
                <PatientsInfo />
              </PriviteRote>
            }
          />
        </Route>
        <Route
          path="superadmin"
          element={
            <PriviteRote roles={["superadmin"]}>
              <SuperAdminLayout />
            </PriviteRote>
          }
        >
          <Route
            path="clinics"
            element={
              <PriviteRote roles={["superadmin"]}>
                <Clinics />
              </PriviteRote>
            }
          />
          <Route
            path="murojaatlar"
            element={
              <PriviteRote roles={["superadmin"]}>
                <SupportMessages />
              </PriviteRote>
            }
          />
          <Route
            path="moliya"
            element={
              <PriviteRote roles={["superadmin"]}>
                <Moliya />
              </PriviteRote>
            }
          />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
