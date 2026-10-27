import axios from "axios";
import SecureStorage from "react-secure-storage";

// Apilar va versiyalar
const baby = "https://api.babyortomed.one-med.info"; /// 8080
const bm = "https://api.bm.one-med.info"; /// 8081
const titan = "https://api.titan-renesans.one-med.info"; /// 8082
const nero = "https://api.nerolife.one-med.info"; /// 8083
const murtazayev = "https://api.murtazayev.one-med.info"; /// 8084
const ideal = "https://api.ideal.one-med.info"; /// 8085
const estelife = "https://api.estelife.one-med.info"; /// 8086
const local = "http://127.0.0.1:8000"; // lokal backend (titan-renesans DB)

// Build vaqtida VITE_BASE_API orqali beriladi (masalan production serverga deploy qilishda),
// bo'lmasa lokal backendga tushadi.
const baseURL = import.meta.env.VITE_BASE_API || local;

console.log(baby, bm, titan, nero, murtazayev, ideal, estelife);

const api = axios.create({
  baseURL,
});

// Har bir so‘rovga access token qo‘shish
api.interceptors.request.use(
  async (config) => {
    const token = SecureStorage.getItem("accessToken");
    // console.log(token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Agar 401 (Unauthorized) bo'lsa, tokenni yangilash
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log("Access token eskirgan, yangilanmoqda...");

      const refreshToken = SecureStorage.getItem("refreshToken");

      if (!refreshToken) {
        console.log("Refresh token yo‘q, login sahifasiga yo‘naltirilmoqda...");
        window.location.href = "/";
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${local}/v1/auth/login`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access_token;
        SecureStorage.setItem("accessToken", newAccessToken);
        api.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${newAccessToken}`;

        // Oldingi so‘rovni qayta yuborish
        error.config.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(error.config);
      } catch (refreshError) {
        console.error("Refresh token eskirgan yoki noto‘g‘ri:", refreshError);
        SecureStorage.removeItem("accessToken");
        SecureStorage.removeItem("refreshToken");
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
