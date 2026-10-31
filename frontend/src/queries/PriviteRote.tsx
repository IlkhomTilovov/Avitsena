import { Navigate } from "react-router-dom";
import SecureStorage from "react-secure-storage";
import { getRoleHomePath } from "../utils/roleRoutes";

export default function PriviteRote({
  children,
  roles,
}: {
  children: JSX.Element;
  roles?: string[];
}) {
  const token = SecureStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (roles && roles.length) {
    const role = SecureStorage.getItem("role") as string | null;

    if (role && !roles.includes(role)) {
      return <Navigate to={getRoleHomePath(role)} replace />;
    }
  }

  return children;
}
