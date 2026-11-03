// ========================= IMPORTS =========================
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  Empty,
  Modal,
  Spin,
  Form,
  Select,
  TreeSelect,
  Pagination,
  Card,
  Input,
  Button,
  Divider,
  notification,
  Space,
  DatePicker,
  Upload,
  Popconfirm,
  // Upload,
} from "antd";
import {
  AppstoreOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  // UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

// ===== Icons =====
import { IoMdArrowBack } from "react-icons/io";
import { BiSolidEditAlt } from "react-icons/bi";
import { RiUser3Line } from "react-icons/ri";
import { LuUser, LuHeart } from "react-icons/lu";
import { BsCalendar4, BsTelephone } from "react-icons/bs";
import { GrDocumentText } from "react-icons/gr";
// import { FiPlus } from "react-icons/fi";
import { GoTrash } from "react-icons/go";

import "../App.css";
import {
  DeleteResponse,
  DiagnosisResponse,
  AvitcenaAdmin,
} from "../queries/query";
import { PatientRequest, PatientResponse } from "../pages/Registration";
import { UploadOutlined } from "@ant-design/icons";
import type { PopconfirmProps, UploadFile, UploadProps } from "antd";
import type { UploadRequestOption as RcCustomRequestOptions } from "rc-upload/lib/interface";
import apiaxios from "./api";
import SecureStorage from "react-secure-storage";
import { useReactToPrint } from "react-to-print";
import Receipt from "./Check";

// ========================= TYPES =========================
// Pasport, ID, hujjatlar uchun
type Document = {
  series: string;
  number: string;
  jshr: string;
  issued_by: string;
  issued_date: string;
  expiry_date: string;
};

// Haydovchilik guvohnomasi uchun
type DriverLicense = {
  number: string;
  jshr: string;
};

// Bemor statistikasi (bemor sahifasi uchun)
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

// Bemor modeli
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
  date_of_birth: string;
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

// Tahlil (analiz) modeli
type Analysis = {
  id: string;
  visit: string | null;
  name: string;
  result: string | null;
  file: string | null;
  created_at: string;
};

type AnalysesResponse = {
  success: boolean;
  data: Analysis[];
};

// Patientni select qilganda qaytadigan API javobi
type PatientSelectResponse = {
  success: boolean;
  data: Patient;
};

// Servis modeli
type Service = {
  id: string;
  name: string;
  price: number;
};

// Vizit modeli
type Visit = {
  id: string;
  doctor: string;
  services: Service[];
  total_price: number;
  diagnosis: string | null;
  created_at: string;
  status: "pending" | "completed" | "cancelled" | string;
  payment_method?: "cash" | "card" | "click_payme" | "transfer" | null;
  payment_method_display?: string | null;
};

// Pagination meta ma'lumotlari
type Meta = {
  total_pages: number;
  total_items: number;
  current_page: number;
};

// Vizitlarni olish uchun response
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

export interface Recipe {
  id: string;
  name: string;
  description: string;
}

// Response turi
export interface RecipesResponse {
  success: boolean;
  message: string;
  data: {
    recipes: Recipe[];
    file: string;
    created_at: string;
    services: Service[];
    doctor: string;
    room_number: string;
    queue: string;
    total_price: number;
  };
}
interface visitData {
  created_at: string;
  services: Service[];
  doctor: string;
  room_number: string;
  queue: string;
  total_price: number;
}
interface VisitResponse {
  data: visitData;
}

interface VisitPayload {
  doctor: string;
  services: string[];
}
interface ReceiptData {
  patientName: string | undefined;
  patientLastName: string | undefined;
  patientDateOfBirth?: string | undefined;
  region?: string | undefined;
  date: string;
  services: Service[];
  doctor: string;
  room: string;
  queue_number: string;
  payment: number;
}

type NotificationType = "success" | "info" | "warning" | "error";
// ========================= COMPONENT =========================
export default function PatientsInfo() {

  const [form] = Form.useForm();
  const [formUpdate] = Form.useForm();
  // Modal (yangi tashrif qo‘shish)
  const [isVisitOpen, setIsVisitOpen] = useState(false);

  // Shifokor tanlaganda ID ni ushlab turadigan state
  const [handleSelectDoctorState, setHandleSelectDoctorState] = useState("");

  // URL'dan bemor ID sini olish
  const { id } = useParams<{ id: string }>();

  const [api, contextHolder] = notification.useNotification();

  const openNotificationWithIcon = (
    type: NotificationType,
    message: string,
    descriptioon: string
  ) => {
    api[type]({
      message: message,
      description: descriptioon,
    });
  };

  // Modal ochish-yopish handlerlari
  const showModal = () => {
    setIsVisitOpen(true);
  };
  const handleCancel = () => setIsVisitOpen(false);

  // Modal Edit ochish-yopish handlerlari
  const [editModal, setEditModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const showEditModal = () => {
    setEditModal(true);
  };
  const handleEditancel = () => {
    setEditModal(false);
    setEditMode(false);
  };

  // Delete qilish modal
  const [deleteModal, setDeleteModal] = useState(false);
  const showDeleteModal = () => {
    setDeleteModal(true);
  };
  const handleDeleteCancel = () => {
    setDeleteModal(false);
  };
  const navigate = useNavigate();

  const { mutate: deletePatientMutate, isLoading: deletePatientLoading } =
    useMutation<DeleteResponse, Error, string>(
      (id) => AvitcenaAdmin.deletePatient(id),
      {
        onSuccess: (data) => {
          console.log("Bemor o‘chirildi:", data);
          openNotificationWithIcon(
            "success",
            "O‘chirish muvaffaqiyatli",
            data.message || "Bemor bazadan o‘chirildi!"
          );

          // querylarni invalidate qilish (agar kerak bo‘lsa)
          queryClient.invalidateQueries(["patients"]);

          // sahifadan chiqib ketish (navigate yoki router orqali)
          navigate("/patients"); // react-router-dom bo‘lsa
        },
        onError: () => {
          openNotificationWithIcon(
            "error",
            "O‘chirishda xatolik",
            "Iltimos qayta urinib ko‘ring!"
          );
        },
      }
    );

  // ========================= QUERIES =========================
  // 1. Bemor ma’lumotlari
  const {
    data: patientData,
    isLoading,
    error,
  } = useQuery<PatientSelectResponse, Error>({
    queryKey: ["patient", id],
    queryFn: () => AvitcenaAdmin.selectPatient(id!),
    staleTime: Infinity, // data abadiy fresh
    cacheTime: Infinity,
  });

  // Bemorni malumotlarini tahrirlash modaliga qo'yish

  useEffect(() => {
    if (patientData) {
      formUpdate.setFieldsValue({
        first_name: patientData.data.first_name,
        last_name: patientData.data.last_name,
        middle_name: patientData.data.middle_name,
        phone: patientData.data.phone,
        gender: patientData.data.gender,
        blood_group: patientData.data.blood_group,
        country: patientData.data.country,
        region: patientData.data.region,
        address: patientData.data.address,
        height: patientData.data.height,
        weight: patientData.data.weight,
        date_of_birth: patientData.data.date_of_birth
          ? dayjs(patientData.data.date_of_birth, "YYYY-MM-DD")
          : null,
      });
    }
  }, [patientData, editModal]);

  // Bemorni malumotlarini tahrirlash mutation
  const { mutate: updatePatientMutate, isLoading: updatePatientLoading } =
    useMutation<PatientResponse, Error, { id: string; obj: PatientRequest }>(
      ({ id, obj }) => AvitcenaAdmin.updatePatient(id, obj),
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries();
          console.log("Bemor yangilandi:", data);
          openNotificationWithIcon(
            "success",
            "Bemor yangilandi",
            "Muvaffaqqiyatli bajaroldi!"
          );
          // success("Bemor muvaffaqqiyatli yangilandi!");
        },
        onError: () => {
          openNotificationWithIcon(
            "error",
            "Bemor yangilashda xatolik",
            "iltimos qaytadan urinib ko'ring!"
          );
        },
      }
    );

  const handleUpdatePatient = (values: any) => {
    if (!id) return;

    const payload: PatientRequest = {
      ...values,
      date_of_birth: values.date_of_birth
        ? values.date_of_birth.format("YYYY-MM-DD") // yoki "YYYY-MM-DDTHH:mm:ss"
        : "",
    };

    updatePatientMutate({ id, obj: payload });
  };

  // 2. Bemor tashriflari
  const [visitesPage, setvisitespage] = useState(1);
  const { data: patientVisitesData, refetch: visitsFetch } = useQuery<
    VisitsResponse,
    Error
  >({
    queryKey: ["patientVisitesData", id, visitesPage, 10],
    queryFn: () => AvitcenaAdmin.patientVisitesData(id!, visitesPage, 10),
    enabled: false,
  });

  useEffect(() => {
    if (id) {
      visitsFetch();
    }
  }, [id, visitesPage]);

  // 3. Xodimlar (shifokorlar) ro‘yxati
  const { data: employeesData } = useQuery({
    queryKey: ["employees", 1, 20, "", "doctor"],
    queryFn: () => AvitcenaAdmin.getEmployeesFilter(1, 20, "", "doctor"),
    keepPreviousData: true,
    enabled: isVisitOpen, // faqat modal ochilganda chaqiriladi
  });

  // Select uchun shifokor options
  const employeeOptions =
    employeesData?.data?.map((item: any) => ({
      value: item.id,
      label: item.fio,
    })) || [];

  // 4. Doktordan xizmatlar olish
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["services", handleSelectDoctorState],
    queryFn: () => AvitcenaAdmin.getServicesFromDoctor(handleSelectDoctorState),
    enabled: !!handleSelectDoctorState,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // 5. Tibbiy tarix tablari (Tashriflar / Tashxislar / Tahlillar / Retseptlar / To'lovlar)
  type HistoryTab = "visits" | "diagnoses" | "analyses" | "recipes" | "payments";
  const [activeHistoryTab, setActiveHistoryTab] = useState<HistoryTab>("visits");

  const { data: analysesData, isLoading: analysesLoading } = useQuery<
    AnalysesResponse,
    Error
  >({
    queryKey: ["patientAnalyses", id],
    queryFn: () => AvitcenaAdmin.getPatientAnalyses(id!),
    enabled: !!id && activeHistoryTab === "analyses",
  });

  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analysisForm] = Form.useForm();

  const { mutate: addAnalysisMutate, isLoading: addAnalysisLoading } =
    useMutation<any, Error, { name: string; result?: string }>(
      (obj) => AvitcenaAdmin.addPatientAnalysis(id!, obj),
      {
        onSuccess: () => {
          queryClient.invalidateQueries(["patientAnalyses", id]);
          openNotificationWithIcon(
            "success",
            "Tahlil qo'shildi",
            "Yangi tahlil muvaffaqiyatli saqlandi!"
          );
          analysisForm.resetFields();
          setAnalysisModalOpen(false);
        },
        onError: () => {
          openNotificationWithIcon(
            "error",
            "Xatolik yuz berdi",
            "Tahlil qo'shishda xatolik, qaytadan urinib ko'ring!"
          );
        },
      }
    );

  // 6. Tibbiy eslatmalar (allergiya / doimiy dorilar) va keyingi qabul
  const [notesEditMode, setNotesEditMode] = useState(false);
  const [notesForm] = Form.useForm();

  useEffect(() => {
    if (patientData) {
      notesForm.setFieldsValue({
        allergies: patientData.data.allergies,
        medications: patientData.data.medications,
        next_visit_date: patientData.data.next_visit_date
          ? dayjs(patientData.data.next_visit_date)
          : null,
      });
    }
  }, [patientData]);

  const { mutate: updateNotesMutate, isLoading: updateNotesLoading } =
    useMutation<
      any,
      Error,
      { allergies?: string; medications?: string; next_visit_date?: string | null }
    >(
      (obj) => AvitcenaAdmin.updatePatientMedicalNotes(id!, obj),
      {
        onSuccess: () => {
          queryClient.invalidateQueries(["patient", id]);
          openNotificationWithIcon(
            "success",
            "Saqlandi",
            "Tibbiy eslatmalar yangilandi!"
          );
          setNotesEditMode(false);
        },
        onError: () => {
          openNotificationWithIcon(
            "error",
            "Xatolik yuz berdi",
            "Qaytadan urinib ko'ring!"
          );
        },
      }
    );

  // ========================= MUTATION =========================

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptDataBool, setReceiptDataBool] = useState(false);

  useEffect(() => {
    if (receiptData && receiptDataBool) {
      handlePrint();
      //setReceiptData(null); // data reset
      setReceiptDataBool(false); // flag reset
    }
  }, [receiptData, receiptDataBool]);

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef, // 🔑 yangi versiyada contentRef ishlatiladi
    documentTitle: "Bemor cheki", // ixtiyoriy
  });
  const queryClient = useQueryClient();
  const { mutate: addEmployeMutate, isLoading: addEmpLoading } = useMutation<
    VisitResponse, // success response
    Error, // error
    VisitPayload
  >((obj) => AvitcenaAdmin.addNewVisit(id!, obj), {
    onSuccess: (data) => {
      console.log(data);
      queryClient.invalidateQueries(["patient", id]); // bemorni qayta chaqirish
      visitsFetch();
      openNotificationWithIcon(
        "success",
        "Bemorga tashrif qo'shildi",
        "Yangi tashrif qo'shish operatsiyasi muvaffaqiyatli bajarildi!"
      );
      form.resetFields();
      setReceiptData({
        patientName: patientData?.data.first_name,
        patientLastName: patientData?.data.last_name,
        patientDateOfBirth: patientData?.data.date_of_birth,
        region: patientData?.data.region,
        date: data.data.created_at,
        services: data.data.services,
        doctor: data.data.doctor,
        room: data.data.room_number,
        queue_number: data.data.queue,
        payment: data.data.total_price,
      });
      setReceiptDataBool(true);
      setIsVisitOpen(false); // modal yopish
    },
    onError: (error) => {
      console.log(error);
    },
  });

  // Form submit (yangi tashrif)
  const handleNewVisit = (value: { doctor: string; services: string[] }) => {
    if (!id) return;
    addEmployeMutate(value);
  };

  // Doktor tanlash
  const handleSelectDoctor = (value: string) => {
    setHandleSelectDoctorState(value);
  };

  const [diagnosModal, setDiagnosModal] = useState(false);

  const { mutate: diagnosMuatate, isLoading: diagnosLoading } = useMutation<
    DiagnosisResponse, // success response type
    Error, // error type
    { id: string; obj: any } // mutate fn param type
  >(({ id, obj }) => AvitcenaAdmin.addDiagnosis(id, obj), {
    onSuccess: () => {
      // Diagnos qo‘shilganda cache yangilash
      queryClient.invalidateQueries(["Recipes", id, visitId]);
    },
  });

  const [visitId, setVisitId] = useState("");

  const { data: visitRecipes, isLoading: visitResipesLoading } =
    useQuery<RecipesResponse>({
      queryKey: ["Recipes", id, visitId], // paramlarni key ichiga qo‘shamiz
      queryFn: ({ queryKey }) => {
        const [, id, vId] = queryKey as [string, string, string];
        return AvitcenaAdmin.recipesList(id, vId);
      },
      enabled: !!id && !!visitId, // faqat id va visitId bo‘lsa ishlaydi
    });

  // console.log(patientData);

  useEffect(() => {
    if (visitRecipes?.data) {
      const v = visitRecipes.data;

      setReceiptData({
        patientName: patientData?.data.first_name,
        patientLastName: patientData?.data.last_name,
        patientDateOfBirth: patientData?.data.date_of_birth,
        region: patientData?.data.region,
        date: v.created_at,
        services: v.services,
        doctor: v.doctor,
        room: v.room_number,
        queue_number: v.queue,
        payment: v.total_price,
      });
    }
  }, [visitRecipes]);

  const handleTextDiagnos = (visitId: string) => {
    setVisitId(visitId);
    setDiagnosModal(true);
  };

  const handleOkDiagnos = () => {
    setDiagnosModal(false);
  };
  const handleCancelDiagnos = () => setDiagnosModal(false);

  const sendDiagnos = (values: any) => {
    diagnosMuatate({
      id: visitId,
      obj: values,
    });
  };

  // ========================= DERIVED DATA =========================
  // Yoshni hisoblash
  const age =
    new Date().getFullYear() -
    Number(patientData?.data.date_of_birth.slice(0, 4));

  // Ism familiya bosh harflari (avatar uchun)
  const logo1 = patientData?.data.first_name.slice(0, 1);
  const logo2 = patientData?.data.last_name.slice(0, 1);

  // Gender
  const gender =
    patientData?.data.gender === "male"
      ? "Erkak"
      : patientData?.data.gender === "female"
      ? "Ayol"
      : "";

  // TreeSelect uchun service daraxti

  const treeData2 = categories
    ? categories.map((category: Category) => ({
        value: category.id,
        title: category.name,
        disabled: category.services.length === 0,
        selectable: false, // parent tanlanmaydi
        children: category.services.map((srv: Service) => ({
          value: srv.id,
          title: srv.name,
        })),
      }))
    : [];

  const location = useLocation();

  // Component ichida
  const { mutate: updateStatus, isLoading: updateStatusLoading } = useMutation<
    any,
    Error,
    { id: string; visitId: string; obj: { status: string } }
  >(({ id, visitId, obj }) => AvitcenaAdmin.statusPatch(id, visitId, obj), {
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["Visit", variables.id, variables.visitId]);
      Modal.success({ content: "Holat yangilandi!" });
      Modal.destroyAll();
      visitsFetch();
      setDiagnosModal(false);
    },
    onError: () => {
      Modal.error({ content: "Xatolik yuz berdi!" });
    },
  });

  // Funksiya chaqiradigan joy
  const updateStatusFunc = (id: string, visitId: string, status: string) => {
    updateStatus({ id, visitId, obj: { status } });
  };

  const { confirm } = Modal;
  const showConfirm = () => {
    confirm({
      title: "Amalni tanlang",
      icon: <ExclamationCircleOutlined />,
      content: "Iltimos, kerakli tugmani tanlang.",
      footer: () => (
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            className="!border-red-500 !text-red-500 cursor-pointer"
            onClick={() => {
              if (!id || !visitId) {
                Modal.error({ content: "ID yoki Visit ID topilmadi!" });
                return;
              }
              updateStatusFunc(id, visitId, "cancelled");
            }}
          >
            {updateStatusLoading ? (
              <Spin indicator={<LoadingOutlined spin />} />
            ) : (
              "Bekor qildim"
            )}
          </Button>
          <Button
            className="!border-blue-500 !text-blue-500 cursor-pointer"
            onClick={() => {
              if (!id || !visitId) {
                Modal.error({ content: "ID yoki Visit ID topilmadi!" });
                return;
              }
              updateStatusFunc(id, visitId, "in_progress");
            }}
          >
            {updateStatusLoading ? (
              <Spin indicator={<LoadingOutlined spin />} />
            ) : (
              "Ko'ryabman"
            )}
          </Button>
          <Button
            className="!border-green-500 !text-green-500 cursor-pointer"
            onClick={() => {
              if (!id || !visitId) {
                Modal.error({ content: "ID yoki Visit ID topilmadi!" });
                return;
              }
              updateStatusFunc(id, visitId, "completed");
            }}
          >
            {updateStatusLoading ? (
              <Spin indicator={<LoadingOutlined spin />} />
            ) : (
              "Ko'rib bo'ldim"
            )}
          </Button>
        </Space>
      ),
    });
  };

  const currentPath = location.pathname.split("/")[1] || "doctor";

  // --------------- File yuklash -----------------

  const backendFileUrl = visitRecipes?.data?.file; // backenddan kelgan URL

  const defaultFileList: UploadFile[] = backendFileUrl
    ? [
        {
          uid: "-1", // unikal id
          name: backendFileUrl.split("/").pop() || "file", // fayl nomi
          status: "done", // yuklangan deb belgilaymiz
          url: backendFileUrl, // yuklab olish uchun link
        },
      ]
    : [];

  const customRequest = async (options: RcCustomRequestOptions) => {
    const { file, onSuccess, onError } = options;

    const formData = new FormData();
    formData.append("file", file as Blob);

    try {
      const response = await apiaxios.patch(
        `/v1/patients/${id}/visits/${visitId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (onSuccess) onSuccess(response.data, file as any);
    } catch (err) {
      if (onError) onError(err as any);
    }
  };

  const props: UploadProps = {
    name: "file",
    customRequest,
    maxCount: 1,
    multiple: false,
    defaultFileList,
    onChange(info) {
      if (info.file.status !== "uploading") {
        console.log(info.file, info.fileList);
      }
      if (info.file.status === "done") {
        openNotificationWithIcon(
          "success",
          "Muvaffaqqiyatli",
          "Fayl muvaffaqiyatli yuklandi!"
        );
      } else if (info.file.status === "error") {
        openNotificationWithIcon(
          "error",
          "Xatolik yuz berdi",
          "Fayl yuklashda xatolik iltimos qaytadan urinib ko'ring!"
        );
      }
    },
    onRemove: async () => {
      try {
        await apiaxios.patch(`/v1/patients/${id}/visits/${visitId}`, {
          file: null,
        });
        openNotificationWithIcon(
          "success",
          "Muvaffaqqiyatli o'chirildi",
          "Fayl muvaffaqiyatli o'chirildi!"
        );
        return true;
      } catch (err) {
        openNotificationWithIcon(
          "error",
          "Xatolik yuz berdi",
          "Fayl o'chirishda xatolik iltimos qaytadan urinib ko'ring!"
        );
        return false;
      }
    },
    // 🔑 custom UI render
    itemRender: (originNode, file, fileList, actions) => {
      console.log(originNode, fileList);
      return (
        <div
          className="justify-between"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          {/* Fayl nomi */}
          <div>
            <a href={file.url} target="_blank" rel="noopener noreferrer">
              {file.name}
            </a>
          </div>

          {/* Yuklab olish tugmasi */}
          <div>
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={() => {
                const link = document.createElement("a");
                link.href = file.url || "";
                link.download = file.name;
                link.click();
              }}
            >
              Yuklab olish
            </Button>

            {/* O‘chirish tugmasi */}
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={actions.remove}
            />
          </div>
        </div>
      );
    },
  };

  // const handleDownload = (file: string) => {
  //   const link = document.createElement("a");
  //   link.href = file;
  //   link.setAttribute("download", "fayl.docx"); // fayl nomini o'zing belgilab qo'yish mumkin
  //   document.body.appendChild(link);
  //   link.click();
  //   link.remove();
  // };

  // tashrifni o'chirish
  const [openPopap, setOpenPopap] = useState(false);
  const { mutateAsync: deleteVisit, isLoading: deleteVisitLoading } =
    useMutation<any, Error, { id: string; visitId: string }>(
      ({ id, visitId }) => AvitcenaAdmin.deleteVisit(id, visitId),
      {
        onSuccess: () => {
          visitsFetch();
          setDiagnosModal(false);
          setOpenPopap(false);
          setVisitId("");
          console.log("delete Visit");
        },
        onError: (err) => {
          console.log(err);
        },
      }
    );

  const confirmVisit: PopconfirmProps["onConfirm"] = async () => {
    setOpenPopap(false);
    if (id) {
      await deleteVisit({ id, visitId });
    }
  };

  const cancel: PopconfirmProps["onCancel"] = (e) => {
    setOpenPopap(false);
    console.log(e);
  };

  // ========================= LOADING / ERROR =========================
  if (isLoading) {
    return (
      <div className="absolute left-0 top-0 z-[9999] w-full h-screen flex justify-center items-center bg-white/20 backdrop:blur-2xl">
        <Spin indicator={<LoadingOutlined spin />} size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute left-0 top-0 z-[9999] w-full h-screen flex justify-center items-center bg-white/20 backdrop:blur-2xl">
        <Empty />
      </div>
    );
  }

  // ========================= RENDER =========================
  return (
    <div className="pr-[10px] md:pr-auto">
      {/* HEADER */}

      <div style={{ display: "none" }}>
        {receiptData && <Receipt ref={componentRef} data={receiptData} />}
      </div>

      {contextHolder}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 my-4 text-[13px]">
        <Link
          to={`${
            currentPath === "doctor"
              ? "/doctor/patients"
              : currentPath === "register"
              ? "/register/patients"
              : "/patients"
          }`}
          className="flex items-center gap-1 text-[#8F99A3] hover:text-[#44525C]"
        >
          <IoMdArrowBack className="text-[14px]" />
          Bemorlar
        </Link>
        <span className="text-[#C7CED3]">/</span>
        <span className="font-[500] text-[#44525C]">
          {patientData?.data.first_name} {patientData?.data.last_name}
        </span>
      </div>

      {/* BANNER */}
      <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-r from-[#0D9488] to-[#14B8A6] px-6 py-5 mb-4 flex md:flex-row flex-col md:items-center items-start gap-4">
        <svg
          className="absolute right-0 top-0 h-full w-[260px] opacity-30 pointer-events-none hidden md:block"
          viewBox="0 0 260 100"
          preserveAspectRatio="none"
        >
          <polyline
            points="0,50 40,50 55,20 70,80 90,50 130,50 145,30 160,70 180,50 260,50"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          />
        </svg>

        <div className="relative shrink-0">
          <div className="flex uppercase justify-center items-center w-[64px] h-[64px] font-[700] text-[18px] rounded-full bg-white/90 text-[#0D9488]">
            {logo1}
            {logo2}
          </div>
          {patientData?.data.status === "active" && (
            <span className="absolute bottom-0 right-0 w-[14px] h-[14px] rounded-full bg-[#1DC981] border-2 border-[#0D9488]" />
          )}
        </div>

        <div className="relative flex-1 text-white min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[20px] font-[700]">
              {patientData?.data.first_name} {patientData?.data.last_name}
            </h2>
            <span className="flex items-center gap-1 text-[11px] font-[600] bg-white/15 px-2 py-0.5 rounded-full">
              <span className="w-[6px] h-[6px] rounded-full bg-[#1DC981]" />
              {patientData?.data.status === "active" ? "Faol" : "Nofaol"}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap text-[12px] text-white/80 mt-1">
            {patientData?.data.code && <span>{patientData.data.code}</span>}
            <span>{gender}</span>
            <span>
              {age} yosh &middot; {patientData?.data.date_of_birth}
            </span>
            {patientData?.data.blood_group && (
              <span>❤ {patientData.data.blood_group}</span>
            )}
          </div>
        </div>

        <div className="relative flex items-center gap-2 shrink-0">
          {currentPath === "doctor" || currentPath === "register" ? (
            ""
          ) : (
            <button
              onClick={showDeleteModal}
              className="cursor-pointer hover:shadow-md transition-all duration-150 text-white border-white/40 px-4 py-2 border rounded-md text-[13px] flex items-center gap-1.5 hover:bg-white/10"
            >
              <GoTrash className="text-[15px]" />
              O'chirish
            </button>
          )}
          <button
            onClick={showEditModal}
            className="cursor-pointer hover:shadow-md transition-all duration-150 text-white border-white/40 px-4 py-2 border rounded-md text-[13px] flex items-center gap-1.5 hover:bg-white/10"
          >
            <BiSolidEditAlt className="text-[15px]" />
            Tahrirlash
          </button>
          {currentPath !== "doctor" && (
            <button
              onClick={showModal}
              className="cursor-pointer hover:shadow-md transition-all duration-150 text-[#0D9488] bg-white px-4 py-2 rounded-md text-[13px] font-[600] flex items-center gap-1.5"
            >
              <AppstoreOutlined />
              Qabulga yozish
            </button>
          )}
        </div>
      </div>

      {/* MA’LUMOT BLOKLARI */}
      <div className="grid grid-cols-12 gap-4 mb-3">
        {/* LEFT: Asosiy ma'lumotlar */}
        <div className="md:col-span-4 col-span-12 flex flex-col gap-3">
          <div className="border bg-[#fff] border-[#E8E8E8] p-[25px] rounded-[10px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <RiUser3Line className="text-[#0D9488] md:text-[22px] text-[18px]" />
                <h3 className="md:text-[20px] text-[16px] font-[500]">
                  Asosiy ma'lumotlar
                </h3>
              </div>
              <button
                onClick={showEditModal}
                className="text-[12px] text-[#0D9488] hover:underline cursor-pointer"
              >
                Tahrirlash
              </button>
            </div>

            {/* Qo‘shimcha info */}
            <div className="flex flex-col gap-3 mt-[20px] text-[12px] md:text-[14px]">
              <div className="flex items-center gap-4">
                <BsCalendar4 className="text-[#8F99A3]" />
                <p>{patientData?.data.date_of_birth}</p>
              </div>
              <div className="flex items-center gap-4">
                <LuUser className="text-[#8F99A3]" />
                <p>{gender}</p>
              </div>
              <div className="flex items-center gap-4">
                <LuHeart className="text-[#8F99A3]" />
                <p>{patientData?.data.blood_group || "Kiritilmagan"}</p>
              </div>
              <div className="flex items-center gap-4">
                <BsTelephone className="text-[#8F99A3]" />
                <p>{patientData?.data.phone}</p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <LuUser className="text-[#8F99A3] opacity-0" />
                  <p>{patientData?.data.address || "Manzil kiritilmagan"}</p>
                </div>
                {!patientData?.data.address && (
                  <span className="text-[10px] font-[600] text-[#B5820A] bg-[#FEF6E6] px-2 py-0.5 rounded-full shrink-0">
                    To'ldirish
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tibbiy eslatmalar */}
          <div className="border bg-[#fff] border-[#E8E8E8] p-[25px] rounded-[10px]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="md:text-[16px] text-[14px] font-[500]">
                Tibbiy eslatmalar
              </h3>
              <button
                onClick={() => setNotesEditMode(!notesEditMode)}
                className="text-[12px] text-[#0D9488] hover:underline cursor-pointer"
              >
                {notesEditMode ? "Bekor qilish" : "Qo'shish"}
              </button>
            </div>

            {notesEditMode ? (
              <Form
                form={notesForm}
                layout="vertical"
                onFinish={(values) =>
                  updateNotesMutate({
                    ...values,
                    next_visit_date: values.next_visit_date
                      ? values.next_visit_date.toISOString()
                      : null,
                  })
                }
              >
                <Form.Item name="allergies" label="Allergiya">
                  <Input placeholder="Masalan: Penitsillin" />
                </Form.Item>
                <Form.Item name="medications" label="Doimiy dorilar">
                  <Input placeholder="Masalan: Metformin 500mg" />
                </Form.Item>
                <Form.Item name="next_visit_date" label="Keyingi qabul sanasi">
                  <DatePicker showTime className="!w-full" />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  style={{ background: "#0D9488" }}
                >
                  {updateNotesLoading ? (
                    <Spin indicator={<LoadingOutlined spin />} />
                  ) : (
                    "Saqlash"
                  )}
                </Button>
              </Form>
            ) : (
              <div className="flex flex-col gap-3 text-[13px]">
                <div>
                  <p className="text-[11px] text-[#8F99A3]">Allergiya</p>
                  <p>{patientData?.data.allergies || "Ma'lumot yo'q"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#8F99A3]">Doimiy dorilar</p>
                  <p>{patientData?.data.medications || "Ma'lumot yo'q"}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Statistika + Tibbiy tarix */}
        <div className="md:col-span-8 col-span-12 flex flex-col gap-3">
          {/* Stat mini-cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
              <p className="text-[11px] text-[#8F99A3]">Jami tashriflar</p>
              <p className="text-[18px] font-[700]">
                {patientData?.data.stats?.total_visits ?? 0} ta
              </p>
            </div>
            <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
              <p className="text-[11px] text-[#8F99A3]">So'nggi tashrif</p>
              <p className="text-[14px] font-[700]">
                {patientData?.data.stats?.last_visit_date
                  ? dayjs(patientData.data.stats.last_visit_date).format(
                      "YYYY-MM-DD"
                    )
                  : "—"}
              </p>
            </div>
            <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
              <p className="text-[11px] text-[#8F99A3]">Keyingi qabul</p>
              <p className="text-[14px] font-[700]">
                {patientData?.data.next_visit_date
                  ? dayjs(patientData.data.next_visit_date).format(
                      "YYYY-MM-DD"
                    )
                  : "—"}
              </p>
            </div>
            <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
              <p className="text-[11px] text-[#8F99A3]">Jami to'lov</p>
              <p className="text-[14px] font-[700]">
                {(patientData?.data.stats?.total_paid ?? 0).toLocaleString()}{" "}
                so'm
              </p>
            </div>
          </div>

        {/* RIGHT: Tibbiy tarix */}
          <div className="border bg-[#fff] border-[#E8E8E8] p-[25px] rounded-[10px]">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <GrDocumentText className="md:text-[22px] text-[18px]" />
              <h3 className="md:text-[20px] text-[16px] font-[500]">
                Tibbiy tarix
              </h3>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 flex-wrap border-b border-[#ECEFF1] mb-4">
              {(
                [
                  { key: "visits", label: "Tashriflar", count: patientData?.data.stats?.total_visits },
                  { key: "diagnoses", label: "Tashxislar", count: patientData?.data.stats?.diagnosis_count },
                  { key: "analyses", label: "Tahlillar", count: patientData?.data.stats?.analysis_count },
                  { key: "recipes", label: "Retseptlar", count: patientData?.data.stats?.recipe_count },
                  { key: "payments", label: "To'lovlar", count: patientData?.data.stats?.payment_count },
                ] as { key: HistoryTab; label: string; count?: number }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveHistoryTab(tab.key)}
                  className={`px-3 py-2 text-[13px] font-[500] border-b-2 -mb-[1px] cursor-pointer transition-colors ${
                    activeHistoryTab === tab.key
                      ? "border-[#0D9488] text-[#0D9488]"
                      : "border-transparent text-[#8F99A3] hover:text-[#44525C]"
                  }`}
                >
                  {tab.label}{" "}
                  <span className="text-[11px]">{tab.count ?? 0}</span>
                </button>
              ))}
            </div>

            {/* Tashriflar bo‘limi */}
            <div>
              {/* Header */}
              <div className="flex justify-between items-center my-4">
                <h3 className="font-[500] text-[14px] md:text-[16px]">
                  {activeHistoryTab === "visits" && "Tashriflar tarixi"}
                  {activeHistoryTab === "diagnoses" && "Tashxislar"}
                  {activeHistoryTab === "analyses" && "Tahlillar"}
                  {activeHistoryTab === "recipes" && "Retseptlar"}
                  {activeHistoryTab === "payments" && "To'lovlar"}
                </h3>
                {activeHistoryTab === "analyses" && currentPath !== "doctor" ? (
                  <button
                    onClick={() => setAnalysisModalOpen(true)}
                    className="flex hover:shadow-md transition-all duration-150 items-center text-white bg-[#0D9488] text-[12px] px-4 py-2.5 gap-2 rounded-md cursor-pointer"
                  >
                    <AppstoreOutlined /> Tahlil qo'shish
                  </button>
                ) : currentPath === "doctor" ? (
                  ""
                ) : (
                  <button
                    onClick={showModal}
                    className="flex  hover:shadow-md transition-all duration-150 items-center text-white bg-[#0D9488] text-[12px] px-4 py-2.5 gap-2 rounded-md cursor-pointer"
                  >
                    <AppstoreOutlined className="hidden md:block" />{" "}
                    Yangi tashrif qo'shish
                  </button>
                )}
              </div>

              {/* Tahlil qo'shish modal */}
              <Modal
                title="Yangi tahlil qo'shish"
                open={analysisModalOpen}
                onCancel={() => setAnalysisModalOpen(false)}
                footer={false}
                centered
              >
                <Form
                  form={analysisForm}
                  layout="vertical"
                  onFinish={(values) => addAnalysisMutate(values)}
                >
                  <Form.Item
                    name="name"
                    label="Tahlil nomi"
                    rules={[{ required: true, message: "Tahlil nomini kiriting!" }]}
                  >
                    <Input placeholder="Masalan: Qon tahlili" />
                  </Form.Item>
                  <Form.Item name="result" label="Natija">
                    <Input.TextArea placeholder="Natija haqida qisqacha" />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    style={{ background: "#0D9488" }}
                  >
                    {addAnalysisLoading ? (
                      <Spin indicator={<LoadingOutlined spin />} />
                    ) : (
                      "Saqlash"
                    )}
                  </Button>
                </Form>
              </Modal>

              {/* Tahlillar ro'yxati */}
              {activeHistoryTab === "analyses" &&
                (analysesLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <Spin indicator={<LoadingOutlined spin />} size="large" />
                  </div>
                ) : !analysesData?.data?.length ? (
                  <Empty description="Hali tahlillar yo'q" />
                ) : (
                  analysesData.data.map((a) => (
                    <div
                      key={a.id}
                      className="border border-[#c9c9c9] rounded-[10px] border-l-[4px] border-l-[#0D9488] px-6 py-4 mb-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="md:text-[17px] text-[13px] font-[500]">
                          {a.name}
                        </h4>
                        <span className="md:text-[14px] text-[10px] text-[#676767]">
                          {dayjs(a.created_at).format("YYYY-MM-DD HH:mm")}
                        </span>
                      </div>
                      {a.result && (
                        <p className="text-[13px] text-[#676767] mt-2">
                          {a.result}
                        </p>
                      )}
                    </div>
                  ))
                ))}

              {/* Modal  yangi tashrif*/}

              <Modal
                title={
                  <div className="flex text-[12px] md:text-[16px] items-center gap-2 text-lg font-semibold">
                    <AppstoreOutlined className="text-[#4D94FF]" />
                    <span>Yangi tashrif qo'shish</span>
                  </div>
                }
                open={isVisitOpen}
                onCancel={handleCancel}
                footer={false}
                maskClosable={false}
                centered
              >
                <Form
                  onFinish={handleNewVisit}
                  layout="vertical"
                  className="space-y-4"
                  form={form}
                >
                  {/* Doctor select */}
                  <Form.Item
                    name="doctor"
                    label={
                      <div className="flex items-center gap-1">
                        <UserOutlined className="text-[#4D94FF]" />
                        <span>Shifokor</span>
                      </div>
                    }
                    rules={[{ required: true, message: "Shifokorni tanlang!" }]}
                  >
                    <Select
                      className="w-full"
                      placeholder="Shifokorni tanlang"
                      onChange={handleSelectDoctor}
                      options={employeeOptions}
                    />
                  </Form.Item>

                  {/* Services tree */}
                  {handleSelectDoctorState && (
                    <Form.Item
                      name="services"
                      label={
                        <div className="flex items-center gap-1">
                          <AppstoreOutlined className="text-[#4D94FF]" />
                          <span>Servislar</span>
                        </div>
                      }
                      rules={[
                        { required: true, message: "Servislarni tanlang!" },
                      ]}
                    >
                      <TreeSelect
                        showSearch
                        style={{ width: "100%" }}
                        multiple
                        allowClear
                        placeholder="Servislarni tanlang"
                        treeCheckable
                        treeDefaultExpandAll
                        showCheckedStrategy={TreeSelect.SHOW_CHILD}
                        treeData={treeData2}
                      />
                    </Form.Item>
                  )}

                  {/* Submit */}
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      className="h-11 rounded-md"
                    >
                      {addEmpLoading ? (
                        <Spin
                          indicator={<LoadingOutlined spin />}
                          className="!text-white"
                        />
                      ) : (
                        "Saqlash"
                      )}
                    </Button>
                  </Form.Item>
                </Form>
              </Modal>

              {/* Modal Update qilish  */}
              <Modal
                title={
                  <div className="flex text-[12px] md:text-[16px] items-center gap-2 text-lg font-semibold">
                    <BiSolidEditAlt className="text-[#4D94FF]" />
                    <span>Bemor ma'lumotlarini tahrirlash</span>
                  </div>
                }
                open={editModal}
                onCancel={handleEditancel}
                footer={false}
                centered
              >
                <Form
                  onFinish={handleUpdatePatient}
                  layout="vertical"
                  className="space-y-4"
                  form={formUpdate}
                >
                  <Card className="!border-none">
                    <Form.Item
                      label="Ism"
                      name="first_name"
                      rules={[{ required: true, message: "Ism kiriting!" }]}
                    >
                      <Input disabled={!editMode} />
                    </Form.Item>
                    <Form.Item
                      label="Familiya"
                      name="last_name"
                      rules={[
                        { required: true, message: "Familiya kiriting!" },
                      ]}
                    >
                      <Input disabled={!editMode} />
                    </Form.Item>
                    <Form.Item label="Otasining ismi" name="middle_name">
                      <Input disabled={!editMode} />
                    </Form.Item>
                    <Form.Item
                      label="Telefon raqami"
                      name="phone"
                      rules={[
                        {
                          required: true,
                          message: "Telefon raqamini kiriting!",
                        },
                      ]}
                    >
                      <Input disabled={!editMode} />
                    </Form.Item>

                    <Form.Item label="Uy telefon raqami" name="home_phone">
                      <Input disabled={!editMode} />
                    </Form.Item>
                    <Form.Item label="Jinsi" name="gender">
                      <Select
                        disabled={!editMode}
                        options={[
                          { value: "male", label: "Erkak" },
                          { value: "female", label: "Ayol" },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="blood_group" label="Qon guruhi">
                      <Select
                        disabled={!editMode}
                        className=""
                        options={[
                          { value: "A+", label: "A+" },
                          { value: "A-", label: "A-" },
                          {
                            value: "B+",
                            label: "B+",
                          },
                          {
                            value: "B-",
                            label: "B-",
                          },
                          {
                            value: "AB+",
                            label: "AB+",
                          },
                          {
                            value: "AB-",
                            label: "AB-",
                          },
                          {
                            value: "O+",
                            label: "O-",
                          },
                        ]}
                      />
                    </Form.Item>

                    <Form.Item label="Tug'ilgan kuni" name="date_of_birth">
                      <DatePicker disabled={!editMode} className="!w-full" />
                    </Form.Item>
                    <Form.Item label="Mamlakat" name="country">
                      <Select
                        disabled={!editMode}
                        options={[{ value: "uz", label: "Uzbekistan" }]}
                      />
                    </Form.Item>
                    <Form.Item label="Shahar" name="region">
                      <Input disabled={!editMode} />
                    </Form.Item>
                    <Form.Item label="Tuman, qishloq" name="address">
                      <Input disabled={!editMode} />
                    </Form.Item>
                    <Form.Item label="Bo'yi" name="height">
                      <Input disabled={!editMode} />
                    </Form.Item>
                    <Form.Item label="Og'irligi" name="weight">
                      <Input disabled={!editMode} />
                    </Form.Item>

                    <div>
                      {!editMode ? (
                        <div
                          onClick={() => setEditMode(true)}
                          className="flex  hover:shadow-md transition-all duration-150 justify-center cursor-pointer items-center !w-full !h-[38px] mt-3 px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                        >
                          Tahrirlash
                        </div>
                      ) : (
                        <button
                          type="submit"
                          className="flex  hover:shadow-md transition-all duration-150 justify-center items-center !w-full !h-[38px] mt-3 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          {updatePatientLoading ? (
                            <Spin indicator={<LoadingOutlined spin />} />
                          ) : (
                            "Saqlash"
                          )}
                        </button>
                      )}
                    </div>
                  </Card>
                </Form>
              </Modal>

              {/* Modal Delete qilish kerak */}
              <Modal
                open={deleteModal}
                onCancel={handleDeleteCancel}
                footer={false}
                centered
                closable={false}
                maskClosable={false}
              >
                <div className="flex text-[14px] md:text-[18px] items-center gap-2 text-lg font-semibold">
                  <GoTrash className="text-[#ff4d7c]" />
                  <span>Bemorni o'chirish</span>
                </div>
                <p className="text-[#767676] text-[12px] md:text-[16px] my-3">
                  Haqiqatan ham "{patientData?.data.first_name}{" "}
                  {patientData?.data.last_name}" bemorni o'chirmoqchimisiz? Bu
                  amal bekor qilib bo'lmaydi.
                </p>
                <div className="flex justify-end items-center gap-3">
                  <button
                    onClick={() => setDeleteModal(false)}
                    className="cursor-pointer border  hover:shadow-md transition-all duration-150 border-[#d9d9d9]  md:px-6 px-3 md:py-2 py-1.5  rounded-md md:text-[14px] text-[12px flex md:gap-2 hover:bg-[#E6F4FF] transition-all duration-150"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={() => {
                      if (!id) return;
                      deletePatientMutate(id);
                    }}
                    className="cursor-pointer  hover:shadow-md  text-red-500 border-red-500 md:px-6 px-3 md:py-2 py-1.5 border rounded-md md:text-[14px] text-[12px] flex md:gap-2 hover:bg-[#ffe6e65e] transition-all duration-150"
                  >
                    {deletePatientLoading ? "O‘chirilmoqda..." : "O‘chirish"}
                  </button>
                </div>
              </Modal>

              {/* Modal tashfis qo'shish */}
              <Modal
                open={diagnosModal}
                onOk={handleOkDiagnos}
                onCancel={handleCancelDiagnos}
                footer={false}
                width={700}
                className="rounded-xl"
              >
                <div className="flex items-start justify-between">
                  <h2 className="text-[16px] font-[500]">
                    {`🩺 ${
                      currentPath === "doctor"
                        ? " Tashhis qo'yish"
                        : "Tashhislar ro'yhati"
                    }`}
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      type="primary"
                      onClick={() => setReceiptDataBool(true)}
                    >
                      Print
                    </Button>
                    <Popconfirm
                      title="Bemor tashrifini o'chirish"
                      description={`Haqiqatdan ham o'chirmoqchimisiz,\n eslataman bu amalni bekor qila olmaysiz!`}
                      onConfirm={confirmVisit}
                      onCancel={cancel}
                      open={openPopap}
                      className="mr-[30px]"
                      okText="Ha"
                      onOpenChange={(visible) => setOpenPopap(visible)}
                      cancelText="Yo'q"
                      okButtonProps={{ loading: deleteVisitLoading }}
                    >
                      <Button danger onClick={() => setOpenPopap(true)}>
                        O'chirish
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
                {visitResipesLoading || diagnosLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <Spin indicator={<LoadingOutlined spin />} size="large" />
                  </div>
                ) : (
                  <Form
                    name="dynamic_form_nest_item"
                    onFinish={sendDiagnos}
                    layout="vertical"
                    autoComplete="off"
                  >
                    {/* Avval mavjud retseptlar */}
                    {(visitRecipes?.data?.recipes?.length ?? 0) > 0 ? (
                      <div className="mb-6">
                        <h3 className="text-[16px] font-semibold mb-3">
                          📋 Mavjud retseptlar
                        </h3>
                        <div className="space-y-2">
                          {visitRecipes?.data?.recipes?.map(
                            (r: any, idx: number) => (
                              <Card
                                key={r.id}
                                size="small"
                                className="rounded-md border border-gray-200 shadow-sm !mb-1 "
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <div>
                                    <p className="font-medium">
                                      {idx + 1}. {r.name}
                                    </p>
                                    <p className="text-gray-500 text-sm">
                                      {r.description}
                                    </p>
                                  </div>
                                </div>
                              </Card>
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      <Empty />
                    )}

                    {currentPath !== "doctor" && visitRecipes?.data?.file && (
                      <Card
                        size="small"
                        className="rounded-md border border-gray-200 shadow-sm mt-4"
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-medium">
                            📎 {visitRecipes.data.file.split("/").pop()}
                          </p>
                          <Button
                            type="primary"
                            size="small"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  visitRecipes.data.file,
                                  {
                                    method: "GET",
                                    headers: {
                                      Authorization: `Bearer ${SecureStorage.getItem(
                                        "accessToken"
                                      )}`,
                                    },
                                  }
                                );
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);

                                const link = document.createElement("a");
                                link.href = url;
                                link.download =
                                  visitRecipes.data.file.split("/").pop() ||
                                  "file";
                                document.body.appendChild(link);
                                link.click();
                                link.remove();

                                window.URL.revokeObjectURL(url);
                              } catch (error) {
                                console.error("Yuklab olishda xatolik:", error);
                              }
                            }}
                          >
                            Yuklab olish
                          </Button>
                        </div>
                      </Card>
                    )}

                    {/* Yangi retsept qo'shish formi */}
                    {currentPath === "doctor" && (
                      <>
                        <Form.List name="recipes">
                          {(fields, { add, remove }) => (
                            <div className="space-y-4">
                              <h3 className="text-[16px] font-semibold">
                                ➕ Yangi retsept qo'shish
                              </h3>
                              {fields.map(({ key, name, ...restField }) => (
                                <Card
                                  key={key}
                                  className="rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition"
                                >
                                  <div className="flex gap-3 items-start">
                                    <Form.Item
                                      {...restField}
                                      name={[name, "name"]}
                                      className="flex-1"
                                      label="💊 Dori nomi"
                                      rules={[
                                        {
                                          required: true,
                                          message: "Dori nomini kiriting",
                                        },
                                      ]}
                                    >
                                      <Input placeholder="Masalan: Paracetamol" />
                                    </Form.Item>

                                    <Form.Item
                                      {...restField}
                                      name={[name, "description"]}
                                      className="flex-1"
                                      label="📄 Tavsifi"
                                    >
                                      <Input placeholder="Masalan: Kuniga 2 mahal" />
                                    </Form.Item>

                                    <Button
                                      danger
                                      type="text"
                                      onClick={() => remove(name)}
                                      icon={<MinusCircleOutlined />}
                                    />
                                  </div>
                                </Card>
                              ))}

                              <Form.Item>
                                <div className=" mt-2 gap-2 upload">
                                  <Button
                                    type="dashed"
                                    onClick={() => add()}
                                    block
                                    icon={<PlusOutlined />}
                                    className=" rounded-lg border-dashed  hover:shadow-md transition-all duration-150"
                                  >
                                    Yangi retsept qo'shish
                                  </Button>
                                  <Upload {...props} className="!w-full">
                                    <Button
                                      type="dashed"
                                      block
                                      icon={<UploadOutlined />}
                                      className="!w-full"
                                    >
                                      File yuklash
                                    </Button>
                                  </Upload>
                                </div>
                              </Form.Item>
                            </div>
                          )}
                        </Form.List>
                        {/* <Form.Item
                          name="attachments"
                          valuePropName="fileList"
                          getValueFromEvent={(e) =>
                            Array.isArray(e) ? e : e?.fileList
                          }
                          className="!w-full border"
                        >
                          <h3 className="text-[16px] font-semibold">
                            ➕ Qo'shimcha fayl yuklash
                          </h3>
                          <Upload
                            className="!w-full"
                            beforeUpload={() => false}
                          >
                            <Button icon={<UploadOutlined />}>
                              Fayl yuklash
                            </Button>
                          </Upload>
                        </Form.Item> */}

                        <Divider />

                        <Form.Item className="!flex justify-end">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={showConfirm}
                              type="button"
                              className="rounded-md !px-10 border !h-[36px] flex justify-center items-center cursor-pointer  hover:shadow-md transition-all duration-150"
                            >
                              Statusni o'zgartirish
                            </button>
                            <Button
                              type="primary"
                              htmlType="submit"
                              className="rounded-md !px-10 !h-[36px] hover:shadow-md transition-all duration-150"
                            >
                              Saqlash
                            </Button>
                          </div>
                        </Form.Item>
                      </>
                    )}
                  </Form>
                )}
              </Modal>
              {/* Retseptlar tabi uchun eslatma */}
              {activeHistoryTab === "recipes" &&
                (!patientVisitesData?.data?.length ? (
                  <Empty description="Hali tashriflar yo'q" />
                ) : (
                  <p className="text-[13px] text-[#8F99A3] mb-3">
                    Retseptni ko'rish uchun quyidagi tashriflardan birini
                    tanlang.
                  </p>
                ))}

              {/* Tashriflar / Tashxislar / To'lovlar ro‘yxati */}
              {(activeHistoryTab === "visits" ||
                activeHistoryTab === "diagnoses" ||
                activeHistoryTab === "payments" ||
                activeHistoryTab === "recipes") &&
                (!patientVisitesData?.data?.length ? (
                  activeHistoryTab === "visits" ? (
                    <div className="flex flex-col items-center text-center py-10">
                      <div className="w-[64px] h-[64px] rounded-full bg-[#E9FBF4] flex items-center justify-center text-[#0D9488] text-[28px] mb-3">
                        <GrDocumentText />
                      </div>
                      <h4 className="font-[600] mb-1">Hali tashriflar yo'q</h4>
                      <p className="text-[13px] text-[#8F99A3] max-w-[360px] mb-4">
                        Bemorning birinchi tashrifini qo'shing — shikoyatlar,
                        tavsiyalar va tarix shu yerda ko'rinishda saqlanadi.
                      </p>
                      <div className="flex items-center gap-2 text-[12px] text-[#8F99A3] mb-4 flex-wrap justify-center">
                        <span className="px-3 py-1 rounded-full bg-[#F1F5F4]">
                          1 Shifokorni tanlang
                        </span>
                        <span>›</span>
                        <span className="px-3 py-1 rounded-full bg-[#F1F5F4]">
                          2 Shikoyat va tashxis
                        </span>
                        <span>›</span>
                        <span className="px-3 py-1 rounded-full bg-[#F1F5F4]">
                          3 Retsept va to'lov
                        </span>
                      </div>
                      {currentPath !== "doctor" && (
                        <button
                          onClick={showModal}
                          className="flex hover:shadow-md transition-all duration-150 items-center text-white bg-[#0D9488] text-[13px] px-5 py-2.5 gap-2 rounded-md cursor-pointer"
                        >
                          <AppstoreOutlined /> Yangi tashrif qo'shish
                        </button>
                      )}
                    </div>
                  ) : (
                    <Empty />
                  )
                ) : (
                  patientVisitesData?.data
                    ?.filter((item) =>
                      activeHistoryTab === "diagnoses"
                        ? item.diagnosis !== null
                        : true
                    )
                    .map((item) => {
                      const formatted = dayjs(item.created_at).format(
                        "YYYY-MM-DD HH:mm"
                      );

                      const status =
                        item.status === "pending"
                          ? "Kutilmoqda"
                          : item.status === "in_progress"
                          ? "Jarayonda"
                          : item.status === "cancelled"
                          ? "Bekor qilingan"
                          : "Tekshirilgan";
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleTextDiagnos(item.id)}
                          className={`border cursor-pointer border-[#c9c9c9] rounded-[10px] border-l-[4px] border-l-[#0D9488] px-6 py-4 mb-4`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="md:text-[17px] text-[13px] font-[500]">
                              {item.doctor}
                            </h4>
                            <span className="md:text-[14px] text-[10px] text-[#676767]">
                              {formatted}
                            </span>
                          </div>

                          <div className="flex justify-between items-end">
                            <ul className="mt-3 flex flex-col gap-1">
                              <li className="flex items-center md:text-[14px] text-[12px] gap-2 text-[#676767]">
                                <span className="font-[400] text-[#000]">
                                  Status:
                                </span>
                                <div
                                  className={`${
                                    item.status === "pending"
                                      ? "bg-[#afc4d9]"
                                      : item.status === "in_progress"
                                      ? "bg-[#CDF4E4]"
                                      : item.status === "cancelled"
                                      ? "bg-[#c47d7d]"
                                      : "bg-[#2ef6a3]"
                                  } px-3 py-0.5 text-white rounded-[4px]`}
                                >
                                  {status}
                                </div>
                              </li>
                              <li className="flex items-center md:text-[14px] text-[12px] gap-2 text-[#676767]">
                                <span className="font-[400] text-[#000]">
                                  Servislar:
                                </span>
                                {item.services?.map((i, index) => (
                                  <span
                                    key={i.id || index}
                                    className="text-blue-500"
                                  >
                                    {i.name}
                                    {index !== item.services?.length - 1 &&
                                      ", "}
                                  </span>
                                ))}
                              </li>
                              {item.diagnosis !== null && (
                                <li className="flex items-center md:text-[14px] text-[12px] gap-2 text-[#676767]">
                                  <span className="font-[400] text-[#000]">
                                    Tashhis:
                                  </span>
                                  {item.diagnosis}
                                </li>
                              )}
                              <li className="flex items-center md:text-[14px] text-[12px] gap-2 text-[#676767]">
                                <span className="font-[400] text-[#000]">
                                  To'lov:
                                </span>
                                {item.total_price} so'm
                                <span
                                  className={`px-2 py-0.5 rounded-[4px] text-white text-[11px] ${
                                    item.payment_method_display
                                      ? "bg-[#0D9488]"
                                      : "bg-[#D48806]"
                                  }`}
                                >
                                  {item.payment_method_display
                                    ? `Qabul qilindi (${item.payment_method_display})`
                                    : "Qabul qilinmagan"}
                                </span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      );
                    })
                ))}
              {/* Pagination */}
              {activeHistoryTab !== "analyses" &&
                patientVisitesData?.meta?.total_items &&
                patientVisitesData.meta.total_items > 10 && (
                  <div className="px-6 py-4 border bg-[#F9FAFB] border-[#E0E6EB] flex items-center justify-end rounded-[10px]">
                    <Pagination
                      current={visitesPage}
                      pageSize={10}
                      onChange={(p) => setvisitespage(p)}
                      total={patientVisitesData.meta.total_items}
                    />
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
