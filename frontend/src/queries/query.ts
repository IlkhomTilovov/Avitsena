import axios from "axios";
import SecureStorage from "react-secure-storage";
import api from "../components/api";
import { Dayjs } from "dayjs";
import { EmployeeData, EmployeeResponse } from "../components/EmployeeInfo";
import { UpdateProfilePayload, UserProfileResponse } from "../pages/Settings";

// https://api.babyortomed.one-med.uz
// https://api.bm.one-med.uz    /// ----- Andijondagi med klinika uchun
// https://api.titan-renesans.one-med.uz     /// ---- titan renasans klinikasi uchun
// https://api.nerolife.one-med.uz   /// 8083
// https://api.murtazayev.one-med.uz   /// 8084

// Apilar va versiyalar
const baby = "https://api.babyortomed.one-med.info";
const bm = "https://api.bm.one-med.info";
const titan = "https://api.titan-renesans.one-med.info";
const nero = "https://api.nerolife.one-med.info";
const murtazayev = "https://api.murtazayev.one-med.info";
const ideal = "https://api.ideal.one-med.info";
const estelife = "https://api.estelife.one-med.info"; /// 8086
const local = "http://127.0.0.1:8000"; // lokal backend (titan-renesans DB)

export const baseApi = local;

console.log(baby, bm, titan, nero, murtazayev, ideal);

type ServiceItem = {
  id: string;
  name: string;
  price: number;
};
type Services = {
  id: string;
  name: string;
  services: ServiceItem[];
};

type pasport = {
  series: string;
  number: string;
  jshr: string;
  issued_by: string;
  issued_date: Dayjs;
  expiry_date: Dayjs;
};
type driver = {
  number: string;
  jshr: string;
};
type sendResponseValuesType = {
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  document_type: string;
  pasport?: pasport;
  idcard?: pasport;
  driver_license?: driver;
  gender: string;
  date_of_birth: Dayjs;
  blood_group: string;
  country: string;
  height: number;
  weight: number;
};

type Document = {
  series: string;
  number: string;
  jshr: string;
  issued_by: string;
  issued_date: string;
  expiry_date: string;
};

type DriverLicense = {
  number: string;
  jshr: string;
};

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  phone: string;
  home_phone: string | null;
  gender: "male" | "female";
  blood_group: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  date_of_birth: string; // backend string qaytaradi
  country: string;
  region: string;
  address: string;
  height: number;
  weight: number;
  status: string;
  document_type: "pasport" | "idcard" | "driver_license";
  pasport: Document | null;
  idcard: Document | null;
  driver_license: DriverLicense | null;
  created_at: string;
  updated_at: string;
};
type PatientSelectResponse = {
  success: boolean;
  data: Patient; // bunda date_of_birth, pasport.issued_date ham string edi
};

type PatientResponse = {
  success: boolean;
  message: string;
  data: Patient;
};
type PatientRequest = Omit<
  sendResponseValuesType,
  "date_of_birth" | "pasport" | "idcard"
> & {
  date_of_birth: string;
  pasport?: Omit<Document, "issued_date" | "expiry_date"> & {
    issued_date: string;
    expiry_date: string;
  };
  idcard?: Omit<Document, "issued_date" | "expiry_date"> & {
    issued_date: string;
    expiry_date: string;
  };
  driver_license?: DriverLicense;
};

// Bitta bemorning qisqa ma’lumotlari (search uchun)
type PatientSearchItem = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  gender: "male" | "female"; // faqat shu ikkitasi kelayapti
  status: "active" | "inactive" | string; // agar boshqa statuslar bo‘lishi mumkin bo‘lsa string qoldiramiz
  date_of_birth: string; // YYYY-MM-DD format
  last_visit_date: string | null; // oxirgi tashrif sanasi, null bo‘lishi mumkin
  created_at: string; // ISO datetime
};

// Pagination meta ma’lumotlari
type PaginationMeta = {
  total_pages: number;
  total_items: number;
  current_page: number;
};

// To‘liq search response
type PatientSearchResponse = {
  success: boolean;
  message: string;
  data: PatientSearchItem[];
  meta: PaginationMeta;
};

type visitDoctorType = {
  doctor: string;
  services?: string[];
};

type Service = {
  id: string;
  name: string;
  price: number;
};

type Visit = {
  id: string;
  doctor: string;
  services: Service[];
  total_price: number;
  created_at: string;
  diagnosis: string | null;
  status: "pending" | "completed" | "cancelled" | string; // agar status doim faqat shu 3 bo'lsa union yozamiz, boshqa bo'lishi mumkin bo'lsa string qoldiramiz
};

type Meta = {
  total_pages: number;
  total_items: number;
  current_page: number;
};

type VisitsResponse = {
  success: boolean;
  message: string;
  data: Visit[];
  meta: Meta;
};

// Doktor kategoriyalari
export type Category = {
  id: string;
  name: string;
  services: Service[];
};

// Doktor statistikasi
export type PatientsStats = {
  total_visits: number;
  total_patients: number;
  total_revenue: number;
  daily_stats: number[];
};

// Doktor modeli
export type Doctor = {
  id: string;
  fio: string;
  username: string;
  phone: string;
  role: "doctor" | "admin" | string;
  status: "active" | "inactive" | string;
  experience_year: number | null;
  more: string | null;
  categories: Category[];
  patients_stats: PatientsStats;
};

// Doktor API response
export type DoctorResponse = {
  success: boolean;
  message: string;
  data: Doctor;
};

export type DataCategoryType = {
  id: string;
  name: string;
  services: ServiceItem[]; // ✅ to‘g‘rilandi
};

export type CategoryName = {
  success: boolean;
  data: DataCategoryType;
};

type CategoryData = {
  id: string;
  name: string;
  services: Service[];
};

type CategoryResponse = {
  success: boolean;
  data: CategoryData;
};

type ServiceRequest = {
  name: string;
  price: number;
};

type CreateCategoryServiceRequest = {
  category: string; // category id
  services: ServiceRequest[];
};

// API response tipi
export interface GetOneCategoryResponse {
  success: boolean;
  data: Category;
}

export interface UpdateEmployeePayload {
  fio?: string;
  username?: string;
  phone?: string;
  role?: string;
  more?: string;
  doctor?: {
    experience_year?: number;
    services?: string[]; // services id lari array
  };
}

type Staf_status = {
  total: number;
  admin_count: number;
  registrator_count: number;
  doctor_count: number;
};

type Doctors_stats = {
  id: string;
  fio: string;
  patient_count: number;
  category_name: string | null;
};
type Patients_stats = {
  change_from_last_month: Change_from_last_month;
  new_patients: number;
  patient_coun_of_curr_month: number;
  returned_patients: number;
  total_patients: number;
};
type Change_from_last_month = {
  amount: number;
  percentage: number | null;
};

type Visits_stats = {
  change_from_last_month: Change_from_last_month;
  monthly_revenue: number;
  pending_visits: number;
  today_visits: number;
  total_visits: number;
};

type Data = {
  staff_stats: Staf_status;
  doctors_stats: Doctors_stats[];
  patients_stats: Patients_stats;
  visits_stats: Visits_stats;
};

export type Statistic = {
  success: boolean;
  data: Data;
};

export interface DiagnosisResponse {
  success: boolean;
  data: DiagnosisData;
}

export interface DiagnosisData {
  id: string;
  name: string;
  description: string;
}

export interface UpdateUserProfilePayloadUpdate {
  fio?: string;
  phone?: string;
  username?: string;
  password?: string;
}

// 🔹 Backenddan qaytadigan profil ma’lumoti
export interface UserProfileResponseUpdate {
  fio: string;
  phone: string;
  username: string;
  createdAt?: string;
  updatedAt?: string;
  // backenddan keladigan boshqa fieldlar bo‘lsa qo‘shib ketasan
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export type DeleteResponse = {
  message?: string;
  success?: boolean;
};

export const OneMedAdmin = {
  authLogin: async (obj: { phone: string; password: string }) => {
    const response = await axios.post(`${baseApi}/v1/auth/login`, obj, {
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
    });

    const { access_token, refresh_token, fio, phone, username } =
      response.data.data;
    console.log("accessToken", response.data.data.access_token);
    SecureStorage.setItem("accessToken", access_token);
    SecureStorage.setItem("refreshToken", refresh_token);
    localStorage.setItem("fio", fio);
    SecureStorage.setItem(
      "userSettingData",
      JSON.stringify({ fio, username, phone })
    );
    console.log(response.data);
    return response.data;
  },

  addEmployee: async (obj: {
    fio: string;
    username: string;
    password: string;
    role: string;
    phone: string;
  }) => {
    const response = await api.post(`${baseApi}/v1/users`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  },

  getEmployees: async () => {
    const response = await api.get(`${baseApi}/v1/users`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  },

  getEmployeesFilter: async (
    page: number,
    per_page?: number,
    search?: string,
    role?: string
  ) => {
    const response = await api.get(`${baseApi}/v1/users`, {
      params: {
        page: page || undefined,
        per_page: per_page || undefined,
        search: search || undefined,
        role: role || undefined,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  },

  addClinic: async (obj: {
    name: string;
    phone: string;
    address: string;
    admin: {
      fio: string;
      username: string;
      phone: string;
      password: string;
    };
  }) => {
    const response = await api.post(`${baseApi}/v1/clinics`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  },

  getClinics: async (page: number, per_page?: number, search?: string) => {
    const response = await api.get(`${baseApi}/v1/clinics`, {
      params: {
        page: page || undefined,
        per_page: per_page || undefined,
        search: search || undefined,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  },

  getServices: async (
    page: number,
    pageSize: number
  ): Promise<{ data: Services[] }> => {
    const response = await api.get(
      `${baseApi}/v1/service-categories?page=${page}&per_page=${pageSize}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  },

  addPatient: async (obj: PatientRequest): Promise<PatientResponse> => {
    const response = await api.post(`${baseApi}/v1/patients`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  searchPatient: async (search: string): Promise<any> => {
    const response = await api.get(`${baseApi}/v1/patients`, {
      params: {
        search,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  selectPatient: async (select: string): Promise<PatientSelectResponse> => {
    const response = await api.get(`${baseApi}/v1/patients/${select}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  updatePatient: async (
    id: string,
    obj: PatientRequest
  ): Promise<PatientResponse> => {
    const response = await api.patch(`${baseApi}/v1/patients/${id}`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  getPatientsAll: async (
    page: number,
    per_page?: number,
    search?: string,
    status?: string,
    gender?: string
  ): Promise<PatientSearchResponse> => {
    const response = await api.get(`${baseApi}/v1/patients`, {
      params: {
        page: page || undefined,
        per_page: per_page || undefined,
        search: search || undefined,
        status: status || undefined,
        gender: gender || undefined,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  },

  getServicesFromDoctor: async (id: string): Promise<Category[]> => {
    const response = await api.get(`${baseApi}/v1/users/${id}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data.data.doctor.categories;
  },

  addNewVisit: async (id: string, obj: visitDoctorType): Promise<any> => {
    const response = await api.post(
      `${baseApi}/v1/patients/${id}/visits`,
      obj,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  patientVisitesData: async (
    id: string,
    page?: number,
    per_page?: number
  ): Promise<VisitsResponse> => {
    const response = await api.get(`${baseApi}/v1/patients/${id}/visits`, {
      params: {
        page: page || undefined,
        per_page: per_page || undefined,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  addCategory: async (obj: { name: string }): Promise<CategoryName> => {
    const response = await api.post(`${baseApi}/v1/service-categories`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  addServices: async (
    obj: CreateCategoryServiceRequest
  ): Promise<CategoryResponse> => {
    const response = await api.post(`${baseApi}/v1/services`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  getCategorylist: async (page: number, per_page: number): Promise<any> => {
    const response = await api.get(
      `${baseApi}/v1/service-categories?page=${page}&per_page=${per_page}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  },

  getEmployee: async (id: string): Promise<EmployeeResponse> => {
    const response = await api.get(`${baseApi}/v1/users/${id}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  getOneCategory: async (id: string): Promise<any> => {
    const response = await api.get(`${baseApi}/v1/service-categories/${id}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  editCategory: async (
    id: string,
    obj: { name: string }
  ): Promise<Category> => {
    const response = await api.patch(
      `${baseApi}/v1/service-categories/${id}`,
      obj,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  editService: async (
    id: string,
    obj: { name: string; category: string; price: number }
  ): Promise<{ id: string; name: string; category: string; price: number }> => {
    const response = await api.patch(`${baseApi}/v1/services/${id}`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  deleteService: async (id: string): Promise<{ message?: string }> => {
    const response = await api.delete(`${baseApi}/v1/services/${id}`);
    return response.data || { message: "Deleted successfully" };
  },
  updateCategory: async (
    id: string,
    obj: { name: string }
  ): Promise<{ id: string; name: string }> => {
    const response = await api.patch(
      `${baseApi}/v1/service-categories/${id}`,
      obj,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  deleteCategory: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`${baseApi}/v1/service-categories/${id}`);
    return response.data || { message: "Deleted successfully" };
  },

  getUserProfile: async (): Promise<any> => {
    const response = await api.get(`${baseApi}/v1/user/profile`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  updateProfileData: async (
    obj: UpdateProfilePayload
  ): Promise<UserProfileResponse> => {
    const response = await api.patch(`${baseApi}/v1/user/profile`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  updateEmployee: async (
    id: string,
    obj: UpdateEmployeePayload
  ): Promise<EmployeeData> => {
    const response = await api.patch(`${baseApi}/v1/users/${id}`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  updateNewPassword: async (
    id: string,
    obj: { new_password: string }
  ): Promise<{ success: boolean }> => {
    const response = await api.post(
      `${baseApi}/v1/users/${id}/set-password`,
      obj,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Statistika
  getTodayVisits: async (
    page?: number,
    per_page?: number,
    date?: string,
    status?: string
  ) => {
    const response = await api.get(`${baseApi}/v1/visits/today`, {
      params: {
        page: page || undefined,
        per_page: per_page || undefined,
        date: date || undefined,
        status: status || undefined,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  },

  allStat: async (): Promise<Statistic> => {
    const response = await api.get(`${baseApi}/v1/stats/clinc`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  lineChartData: async (type: string) => {
    const response = await api.get(`${baseApi}/v1/stats/patients`, {
      params: {
        type: type,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },
  barChartData: async () => {
    const response = await api.get(`${baseApi}/v1/stats/visits/monthly`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  tringleData: async (type: string) => {
    const response = await api.get(`${baseApi}/v1/stats/revenue`, {
      params: {
        type: type,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  addDiagnosis: async (id: string, obj: any): Promise<DiagnosisResponse> => {
    const response = await api.post(`${baseApi}/v1/visits/${id}/recipes`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },
  updateUserProfile: async (
    obj: UpdateUserProfilePayloadUpdate
  ): Promise<UserProfileResponseUpdate> => {
    const response = await api.patch(`/v1/user/profile`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  changePassword: async (
    payload: ChangePasswordPayload
  ): Promise<ChangePasswordResponse> => {
    const response = await api.post(
      `${baseApi}/v1/users/change-password`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  recipesList: async (id: string, visitId: string) => {
    const response = await api.get(
      `${baseApi}/v1/patients/${id}/visits/${visitId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // OneMedAdmin ichida
  statusPatch: async (
    id: string,
    visitId: string,
    obj: { status: string }
  ): Promise<any> => {
    const response = await api.patch(
      `${baseApi}/v1/patients/${id}/visits/${visitId}`,
      obj,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  deletePatient: async (id: string): Promise<DeleteResponse> => {
    const response = await api.delete(`${baseApi}/v1/patients/${id}`);
    return response.data || { message: "Deleted successfully", success: true };
  },

  deleteEmployee: async (id: string): Promise<DeleteResponse> => {
    const response = await api.delete(`${baseApi}/v1/users/${id}`);
    return response.data || { message: "Deleted successfully", success: true };
  },

  deleteVisit: async (id: string, visitId: string): Promise<any> => {
    const response = await api.delete(
      `${baseApi}/v1/patients/${id}/visits/${visitId}`
    );
    return response.data || { message: "Deleted successfully", success: true };
  },
};
