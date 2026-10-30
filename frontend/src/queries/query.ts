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

// Build vaqtida VITE_BASE_API orqali beriladi (masalan production serverga deploy qilishda),
// bo'lmasa lokal backendga tushadi.
export const baseApi = import.meta.env.VITE_BASE_API || local;

console.log(baby, bm, titan, nero, murtazayev, ideal, estelife);

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

type PatientStats = {
  total_visits: number;
  last_visit_date: string | null;
  next_visit_date: string | null;
  total_paid: number;
  diagnosis_count: number;
  recipe_count: number;
  analysis_count: number;
  payment_count: number;
};

type Patient = {
  id: string;
  code?: string | null;
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
  allergies?: string | null;
  medications?: string | null;
  next_visit_date?: string | null;
  stats?: PatientStats;
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
  code: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  gender: "male" | "female"; // faqat shu ikkitasi kelayapti
  status: "active" | "inactive" | string; // agar boshqa statuslar bo‘lishi mumkin bo‘lsa string qoldiramiz
  date_of_birth: string; // YYYY-MM-DD format
  last_visit_date: string | null; // oxirgi tashrif sanasi, null bo‘lishi mumkin
  last_visit_doctor: string | null;
  today_visit_status: "pending" | "in_progress" | "cancelled" | "completed" | null;
  visit_count: number;
  created_at: string; // ISO datetime
};

type PatientStatsResponse = {
  success: boolean;
  message: string;
  data: {
    total: number;
    active: number;
    inactive: number;
    new_this_month: number;
  };
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
  duration_minutes?: number | null;
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

export interface FinanceFilters {
  date_from?: string;
  date_to?: string;
  type?: "kirim" | "chiqim";
  doctor?: string;
  service?: string;
  payment_method?: string;
  category?: string;
  status?: string;
  cashier?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

function cleanFinanceFilters(filters: FinanceFilters) {
  const params: Record<string, string | number> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = value;
    }
  });

  return params;
}

export interface FinanceChange {
  percentage: number | null;
  amount: number | null;
}

export interface FinancePaymentMethodBreakdown {
  value: string;
  label: string;
  amount: number;
  percentage: number;
}

export interface FinanceSummary {
  date_from: string;
  date_to: string;
  total_income: number;
  total_expense: number;
  balance: number;
  income_change: FinanceChange;
  expense_change: FinanceChange;
  income_count: number;
  expense_count: number;
  payment_methods: FinancePaymentMethodBreakdown[];
}

export interface FinanceTransaction {
  id: string;
  type: "kirim" | "chiqim";
  date: string;
  reference: string | null;
  title: string;
  subtitle: string;
  doctor: string | null;
  category: string | null;
  payment_method: string | null;
  payment_method_display: string | null;
  cashier: string | null;
  amount: number;
  status: string;
  status_display: string;
}

export interface FinanceTransactionsMeta {
  total_pages: number;
  total_items: number;
  current_page: number;
  income_count: number;
  expense_count: number;
  total_income_amount: number;
  total_expense_amount: number;
  balance: number;
}

export interface FinanceTransactionsResponse {
  success: boolean;
  data: {
    results: FinanceTransaction[];
    meta: FinanceTransactionsMeta;
  };
}

export interface CreateExpensePayload {
  category: string;
  title: string;
  amount: number;
  payment_method?: string;
  date?: string;
}

export interface FinanceCategory {
  id: string;
  type: "kirim" | "chiqim";
  type_display: string;
  name: string;
  icon: string;
  color: string;
  is_system: boolean;
  archived: boolean;
  created_at: string;
  amount: number;
  count: number;
}

export interface FinanceCategoryFilters {
  type?: "kirim" | "chiqim";
  date_from?: string;
  date_to?: string;
  include_archived?: boolean;
}

export interface CreateFinanceCategoryPayload {
  type: "kirim" | "chiqim";
  name: string;
  icon: string;
  color: string;
}

export interface UpdateFinanceCategoryPayload {
  name?: string;
  icon?: string;
  color?: string;
  archived?: boolean;
}

export interface SupportMessageItem {
  id: string;
  clinic: string;
  clinic_name: string;
  user_fio: string | null;
  user_phone: string | null;
  user_role: string | null;
  message: string;
  delivered: boolean;
  created_at: string;
}

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
    role?: string,
    status?: string
  ) => {
    const response = await api.get(`${baseApi}/v1/users`, {
      params: {
        page: page || undefined,
        per_page: per_page || undefined,
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
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
    gender?: string,
    doctor?: string,
    month?: string
  ): Promise<PatientSearchResponse> => {
    const response = await api.get(`${baseApi}/v1/patients`, {
      params: {
        page: page || undefined,
        per_page: per_page || undefined,
        search: search || undefined,
        status: status || undefined,
        gender: gender || undefined,
        doctor: doctor || undefined,
        month: month || undefined,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  },

  getPatientsStats: async (): Promise<PatientStatsResponse> => {
    const response = await api.get(`${baseApi}/v1/patients/stats`, {
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
    obj: Partial<{
      name: string;
      category: string;
      price: number;
      duration_minutes: number | null;
      is_active: boolean;
    }>
  ): Promise<any> => {
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

  getServicesStats: async (): Promise<any> => {
    const response = await api.get(`${baseApi}/v1/services/stats`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
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

  updatePatientMedicalNotes: async (
    id: string,
    obj: {
      allergies?: string | null;
      medications?: string | null;
      next_visit_date?: string | null;
    }
  ): Promise<any> => {
    const response = await api.patch(`${baseApi}/v1/patients/${id}`, obj, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  getPatientAnalyses: async (id: string): Promise<any> => {
    const response = await api.get(`${baseApi}/v1/patients/${id}/analyses`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  addPatientAnalysis: async (
    id: string,
    obj: { name: string; result?: string }
  ): Promise<any> => {
    const response = await api.post(
      `${baseApi}/v1/patients/${id}/analyses`,
      obj,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // ---- Moliya (finance) ----

  financeSummary: async (
    filters: FinanceFilters
  ): Promise<{ success: boolean; data: FinanceSummary }> => {
    const response = await api.get(`${baseApi}/v1/finance/summary`, {
      params: cleanFinanceFilters(filters),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  financeTransactions: async (
    filters: FinanceFilters
  ): Promise<FinanceTransactionsResponse> => {
    const response = await api.get(`${baseApi}/v1/finance/transactions`, {
      params: cleanFinanceFilters(filters),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  financeExport: async (filters: FinanceFilters): Promise<void> => {
    const response = await api.get(
      `${baseApi}/v1/finance/transactions/export`,
      {
        params: cleanFinanceFilters(filters),
        responseType: "blob",
      }
    );

    const disposition = response.headers["content-disposition"] as
      | string
      | undefined;
    const match = disposition?.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : "moliya.csv";

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  createExpense: async (
    payload: CreateExpensePayload
  ): Promise<{ success: boolean; data: FinanceTransaction }> => {
    const response = await api.post(`${baseApi}/v1/finance/expenses`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  deleteExpense: async (id: string): Promise<DeleteResponse> => {
    const response = await api.delete(`${baseApi}/v1/finance/expenses/${id}`);
    return response.data;
  },

  financeCategories: async (
    filters: FinanceCategoryFilters
  ): Promise<{
    success: boolean;
    data: { date_from: string; date_to: string; categories: FinanceCategory[] };
  }> => {
    const response = await api.get(`${baseApi}/v1/finance/categories`, {
      params: cleanFinanceFilters(filters as FinanceFilters),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  createFinanceCategory: async (
    payload: CreateFinanceCategoryPayload
  ): Promise<{ success: boolean; data: FinanceCategory }> => {
    const response = await api.post(
      `${baseApi}/v1/finance/categories`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  updateFinanceCategory: async (
    id: string,
    payload: UpdateFinanceCategoryPayload
  ): Promise<{ success: boolean; data: FinanceCategory }> => {
    const response = await api.patch(
      `${baseApi}/v1/finance/categories/${id}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  sendSupportMessage: async (
    message: string
  ): Promise<{ success: boolean; message?: string }> => {
    const response = await api.post(
      `${baseApi}/v1/support/messages`,
      { message },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  getSupportMessages: async (
    page: number,
    per_page?: number,
    clinic?: string
  ): Promise<{
    success: boolean;
    data: SupportMessageItem[];
    meta: { total_pages: number; total_items: number; current_page: number };
  }> => {
    const response = await api.get(`${baseApi}/v1/support/messages`, {
      params: {
        page: page || undefined,
        per_page: per_page || undefined,
        clinic: clinic || undefined,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },
};
