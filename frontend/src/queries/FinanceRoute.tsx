import { Navigate } from "react-router-dom";
import { useCreateContext } from "../context/ContextApi";
import { getRoleHomePath } from "../utils/roleRoutes";

export default function FinanceRoute({ children }: { children: JSX.Element }) {
  const { getUserProfileData } = useCreateContext();

  // Profil yuklanguncha hech narsa ko'rsatmaymiz
  if (!getUserProfileData) {
    return null;
  }

  if (!getUserProfileData.data.can_view_finance) {
    return <Navigate to={getRoleHomePath(getUserProfileData.data.role)} replace />;
  }

  return children;
}
