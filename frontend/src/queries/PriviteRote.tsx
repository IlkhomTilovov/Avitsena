import { Navigate } from "react-router-dom";
import SecureStorage from "react-secure-storage";

export default function PriviteRote({ children }: { children: JSX.Element }) {
  const token = SecureStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
}
