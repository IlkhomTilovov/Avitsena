import { useEffect } from "react";
import api from "./api"; // Axios instance
import SecureStorage from "react-secure-storage";
const TokenRefresher = () => {
  useEffect(() => {
    const interval = setInterval(async () => {
      const refreshToken = SecureStorage.getItem("refreshToken");

      if (!refreshToken) {
        return;
      }

      try {
        const response = await api.post("/v1/auth/token/refresh", {
          refresh: refreshToken,
        });
        console.log(response.data);
        const newAccessToken = response.data.data.access_token;
        const newRefreshToken = response.data.data.refresh_token;
        SecureStorage.setItem("accessToken", newAccessToken);
        SecureStorage.setItem("refreshToken", newRefreshToken);
        console.log("Yangi access token:", newAccessToken);
        console.log("Yangi Refresh token:", newRefreshToken);
      } catch (error) {
        console.error("Failed to refresh token:", error);
      }
    }, 15 * 60 * 1000); // 15 minut

    return () => clearInterval(interval);
  }, []);

  return null;
};

export default TokenRefresher;
