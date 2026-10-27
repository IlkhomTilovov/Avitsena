import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useQuery } from "react-query";
import { UserProfileResponse } from "../pages/Settings";
import { OneMedAdmin } from "../queries/query";
import SecureStorage from "react-secure-storage";
import { jwtDecode } from "jwt-decode";
import { useLocation } from "react-router-dom";
interface Data {
  fio: string;
  phone: string;
  username: string;
}

interface CreateContProviderInterface {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

  userFio: string;
  setUserFio: React.Dispatch<React.SetStateAction<string>>;

  userData: Data;
  setUserData: React.Dispatch<React.SetStateAction<Data>>;

  getUserProfileData?: UserProfileResponse;
}

export const CreateContProvider = createContext<
  CreateContProviderInterface | undefined
>(undefined);

export function useCreateContext() {
  const context = useContext(CreateContProvider);
  if (!context) {
    throw new Error("useCreateContext must be used within ContextApiProvider");
  }
  return context;
}

export default function ContextApiProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [userFio, setUserFio] = useState("");
  const [userData, setUserData] = useState<Data>({
    fio: "",
    phone: "",
    username: "",
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true); // md dan kichik bo‘lsa
      } else {
        setCollapsed(false); // md dan katta bo‘lsa
      }
    };

    // birinchi renderda ham tekshiradi
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const accessToken = SecureStorage.getItem("accessToken") as string | null;

  function isTokenValid(token: string) {
    try {
      const decoded: { exp?: number } = jwtDecode(token);
      if (!decoded.exp) return false;
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  const isValid = !!accessToken && isTokenValid(accessToken);

  const location = useLocation();

  const { data: getUserProfileData } = useQuery<UserProfileResponse>({
    queryKey: ["getUserProfile"],
    queryFn: () => OneMedAdmin.getUserProfile(),
    staleTime: 0, // 5 min
    cacheTime: 0, // 10 min
    enabled: !!isValid && location.pathname !== "/",
  });

  return (
    <CreateContProvider.Provider
      value={{
        collapsed,
        setCollapsed,
        userFio,
        setUserFio,
        userData,
        setUserData,
        getUserProfileData,
      }}
    >
      {children}
    </CreateContProvider.Provider>
  );
}
