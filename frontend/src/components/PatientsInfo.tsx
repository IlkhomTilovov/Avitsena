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
  OneMedAdmin,
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

// Bemor modeli
type Patient = {
  id: string;
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
  created_at: string;
  updated_at: string;
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
  // Segment (Tashriflar / Dorilar) uchun state
  const [segmentValue, setSegmentValue] = useState(true);

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
    setSegmentValue(true);
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
      (id) => OneMedAdmin.deletePatient(id),
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
    queryFn: () => OneMedAdmin.selectPatient(id!),
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
      ({ id, obj }) => OneMedAdmin.updatePatient(id, obj),
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
    queryFn: () => OneMedAdmin.patientVisitesData(id!, visitesPage, 10),
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
    queryFn: () => OneMedAdmin.getEmployeesFilter(1, 20, "", "doctor"),
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
    queryFn: () => OneMedAdmin.getServicesFromDoctor(handleSelectDoctorState),
    enabled: !!handleSelectDoctorState,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

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
  >((obj) => OneMedAdmin.addNewVisit(id!, obj), {
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
  >(({ id, obj }) => OneMedAdmin.addDiagnosis(id, obj), {
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
        return OneMedAdmin.recipesList(id, vId);
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
  >(({ id, visitId, obj }) => OneMedAdmin.statusPatch(id, visitId, obj), {
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
      ({ id, visitId }) => OneMedAdmin.deleteVisit(id, visitId),
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

      <div className="flex items-center justify-between my-4">
        {/* Orqaga qaytish */}
        {contextHolder}
        <div className="flex items-center gap-4">
          <Link
            to={`${
              currentPath === "doctor"
                ? "/doctor/patients"
                : currentPath === "register"
                ? "/register/patients"
                : "/patients"
            }`}
            className="items-center hidden md:flex gap-1 px-6 py-2.5 text-[14px] font-[500] rounded-md hover:bg-[#E6F4FF]"
          >
            <IoMdArrowBack className="text-[16px]" />
            Orqaga
          </Link>

          {/* Patient ismi + avatar */}
          <div className="flex items-center gap-3">
            <div className="flex uppercase justify-center items-center w-[60px] h-[60px] font-[600] text-[18px] rounded-full bg-[#DBEAFE] text-[#2B7FFF]">
              {logo1}
              {logo2}
            </div>
            <div>
              <h2 className="md:text-[22px] text-[18px] font-[600] mb-[-5px]">
                {patientData?.data.first_name} {patientData?.data.last_name}
              </h2>
              <p className="text-[#9D99AB] font-[300] md:text-[14px] text-[12px]">
                {age} yosh, {gender}
              </p>
            </div>
          </div>
        </div>

        {/* Edit tugmasi */}
        <div className="flex items-center gap-3">
          {currentPath === "doctor" || currentPath === "register" ? (
            ""
          ) : (
            <button
              onClick={showDeleteModal}
              className="cursor-pointer  hover:shadow-md transition-all duration-150 text-red-500 border-red-500 md:px-6 px-3 md:py-2 py-1.5 border  rounded-md md:text-[14px] text-[12px flex md:gap-2 hover:bg-[#ffe6e6] transition-all duration-150"
            >
              <GoTrash className="md:text-[18px] text-[16px]" />
              O'chirish
            </button>
          )}
          <button
            onClick={showEditModal}
            className="cursor-pointer  hover:shadow-md transition-all duration-150 text-blue-500 border-blue-500 md:px-6 px-3 md:py-2 py-1.5 border  rounded-md md:text-[14px] text-[12px flex md:gap-2 hover:bg-[#E6F4FF] transition-all duration-150"
          >
            <BiSolidEditAlt className="md:text-[18px] text-[16px]" />
            Tahrirlash
          </button>
        </div>
      </div>

      {/* MA’LUMOT BLOKLARI */}
      <div className="grid grid-cols-12 gap-4 mb-3">
        {/* LEFT: Asosiy ma'lumotlar */}
        <div className="md:col-span-4 col-span-12 flex flex-col gap-3">
          <div className="border bg-[#fff] border-[#E8E8E8] p-[25px] rounded-[10px]">
            <div className="flex items-center gap-2">
              <RiUser3Line className="text-[#2B7FFF] md:text-[22px] text-[18px]" />
              <h3 className="md:text-[20px] text-[16px] font-[500]">
                Asosiy ma'lumotlar
              </h3>
            </div>

            {/* Avatar */}
            <div className="flex justify-center flex-col text-center mt-[20px]">
              <div className="mx-auto uppercase w-[80px] h-[80px] mb-2 flex items-center justify-center rounded-full bg-[#DBEAFE] font-[600] text-[18px] text-[#2B7FFF]">
                {logo1}
                {logo2}
              </div>
              <h4 className="font-[500]">
                {patientData?.data.first_name} {patientData?.data.last_name}
              </h4>
              <p className="text-[#b6b6b6]">{age} yosh</p>
            </div>

            {/* Qo‘shimcha info */}
            <div className="flex flex-col gap-3 mt-[40px] text-[12px] md:text-[16px]">
              <div className="flex items-center gap-4">
                <BsCalendar4 />
                <p>{patientData?.data.date_of_birth}</p>
              </div>
              <div className="flex items-center gap-4">
                <LuUser />
                <p>{gender}</p>
              </div>
              <div className="flex items-center gap-4">
                <LuHeart />
                <p>{patientData?.data.blood_group}</p>
              </div>
              <div className="flex items-center gap-4">
                <BsTelephone />
                <p>{patientData?.data.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Tibbiy tarix */}
        <div className="md:col-span-8 col-span-12">
          <div className="border bg-[#fff] border-[#E8E8E8] p-[25px] rounded-[10px]">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <GrDocumentText className="md:text-[22px] text-[18px]" />
              <h3 className="md:text-[20px] text-[16px] font-[500]">
                Tibbiy tarix
              </h3>
            </div>

            {/* Tabs */}
            {/* <Segmented
              onChange={() => setSegmentValue(!segmentValue)}
              options={["Tashriflar", "Dorilar"]}
              className="!p-1 seg"
              block
            /> */}

            {/* Tashriflar bo‘limi */}
            <div>
              {/* Header */}
              <div className="flex justify-between items-center my-4">
                <h3 className="font-[500] text-[14px] md:text-[16px]">
                  Tashriflar tarixi
                </h3>
                {currentPath === "doctor" ? (
                  ""
                ) : (
                  <button
                    onClick={showModal}
                    className="flex  hover:shadow-md transition-all duration-150 items-center text-white bg-[#4D94FF] text-[12px] px-4 py-2.5 gap-2 rounded-md cursor-pointer"
                  >
                    <AppstoreOutlined className="text-[#4D94FF] hidden md:block" />{" "}
                    Yangi tashrif qo'shish
                  </button>
                )}
              </div>

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
              {/* Tashriflar ro‘yxati */}
              {segmentValue ? (
                !patientVisitesData?.data?.length ? (
                  <Empty />
                ) : (
                  patientVisitesData?.data?.map((item) => {
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
                        className={`border cursor-pointer border-[#c9c9c9] rounded-[10px] border-l-[4px] border-l-[#4D94FF] px-6 py-4 mb-4`}
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
                                  {index !== item.services?.length - 1 && ", "}
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
                            </li>
                          </ul>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                // Agar "Dorilar" segmenti tanlansa
                <div className="border border-[#c9c9c9] rounded-[10px] border-l-[4px] border-l-[#A855F7] px-6 py-4 mb-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[17px] font-[500]">Metformin 500mg</h4>
                    <span className="text-[14px] text-[#676767]">
                      2024-12-15
                    </span>
                  </div>
                  <p className="text-[14px] text-[#676767] mt-[-3px]">
                    Kuniga 2 marta
                  </p>
                </div>
              )}
              {/* Pagination */}
              {segmentValue &&
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
