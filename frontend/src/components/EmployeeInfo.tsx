import { BiSolidEditAlt } from "react-icons/bi";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaStethoscope } from "react-icons/fa6";
import { PiMedalLight } from "react-icons/pi";
import { LuAtSign, LuUser } from "react-icons/lu";
import { FiPlus } from "react-icons/fi";
import { BsTelephone } from "react-icons/bs";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  DeleteResponse,
  OneMedAdmin,
  UpdateEmployeePayload,
} from "../queries/query";
import {
  Input,
  Modal,
  Form,
  Spin,
  TreeSelect,
  TreeSelectProps,
  notification,
  Card,
} from "antd";
import { BsDoorOpen } from "react-icons/bs";
import { useEffect, useState } from "react";
import { LoadingOutlined } from "@ant-design/icons";
import { GoTrash } from "react-icons/go";
import dayjs from "dayjs";
import {
  ROLE_BADGE_COLOR,
  ROLE_LABEL,
  getAvatarColor,
  getInitials,
} from "../utils/employeeUi";

export interface Service {
  id: string;
  name: string;
  price: number;
}

export interface Category {
  id: string;
  name: string;
  services: Service[];
}

export interface DailyStat {
  date: string; // "YYYY-MM-DD"
  visit_count: number;
  patient_count: number;
  revenue: number;
}

export interface PatientsStats {
  total_visits: number;
  total_patients: number;
  total_revenue: number;
  daily_stats: DailyStat[];
}

export interface DoctorInfo {
  categories: Category[];
  experience_year: number | null;
  patients_stats: PatientsStats;
  room_number: number;
}

export interface EmployeeData {
  id: string;
  fio: string;
  username: string;
  role: "doctor" | "nurse" | "admin" | string; // agar faqat doctor bo‘lsa -> "doctor"
  phone: string;
  doctor: DoctorInfo;
  status: "active" | "inactive" | string;
  more: any; // backenddan nima kelishini bilmagan payt
}

export interface EmployeeResponse {
  success: boolean;
  data: EmployeeData;
}

type NotificationType = "success" | "info" | "warning" | "error";

export default function EmployeeInfo() {
  // URL'dan bemor ID sini olish
  const [form] = Form.useForm();
  const { id } = useParams<{ id: string }>();
  const [enable, setEnable] = useState(false);
  const [serPage, setSerPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [treeData2, setTreeData2] = useState<any[]>([]);
  const [treeSelectValues, setTreeSelectValues] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);

  const [api, contextHolder] = notification.useNotification();

  const openNotificationWithIcon = (
    type: NotificationType,
    message: string,
    desc: string
  ) => {
    api[type]({
      message: message,
      description: desc,
    });
  };

  // 1. xodim ma’lumotlari
  const { data: employeeData, isLoading: employeeDataLoading } = useQuery<
    EmployeeResponse,
    Error
  >({
    queryKey: ["employee", id],
    queryFn: () => OneMedAdmin.getEmployee(id!),
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const chartData =
    employeeData?.data?.doctor?.patients_stats?.daily_stats.map((stat) => ({
      date: stat.date, // X o‘qi uchun date qoldiramiz
      patients: stat.patient_count, // Bemorlari
    })) || [];

  const chartData2 =
    employeeData?.data?.doctor?.patients_stats?.daily_stats.map((stat) => ({
      date: stat.date,
      revenue: stat.revenue, // pul
    })) || [];

  const formatNumber = (value: number) => {
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1) + " mln"; // 2.6 mln
    }
    if (value >= 1_000) {
      return (value / 1_000).toFixed(0) + " ming"; // 20 ming
    }
    return value.toString(); // kichkina sonlar oddiy
  };

  const dailyStats = employeeData?.data?.doctor?.patients_stats?.daily_stats || [];
  const todayStr = dayjs().format("YYYY-MM-DD");
  const currentMonthStr = dayjs().format("YYYY-MM");

  const todayPatients =
    dailyStats.find((stat) => stat.date === todayStr)?.patient_count ?? 0;

  const monthDailyStats = dailyStats.filter(
    (stat) => dayjs(stat.date).format("YYYY-MM") === currentMonthStr
  );
  const monthPatients = monthDailyStats.reduce(
    (acc, stat) => acc + Number(stat.patient_count),
    0
  );
  const monthRevenue = monthDailyStats.reduce(
    (acc, stat) => acc + Number(stat.revenue || 0),
    0
  );

  const avgPatientsPerDay = dailyStats.length
    ? dailyStats.reduce((acc, stat) => acc + Number(stat.patient_count), 0) /
      dailyStats.length
    : 0;

  // console.log(employeeData?.data);

  const serviceIds = Array.from(
    new Set(
      employeeData?.data?.doctor?.categories.flatMap((c) =>
        c.services.map((s) => s.id)
      )
    )
  );
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalPassOpen, setIsModalPassOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
    setEnable(true);
    setTreeSelectValues(serviceIds);
  };
  const showModalPassword = () => {
    setIsModalPassOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEnable(false);
  };

  const handleOkPass = () => {
    setIsModalPassOpen(false);
  };

  const handleCancelPass = () => {
    setIsModalPassOpen(false);
  };

  const queryClient = useQueryClient();
  const { mutate: updateEmployeeMutate, isLoading: updateEmployeeLoading } =
    useMutation<
      EmployeeData,
      Error,
      { id: string; data: UpdateEmployeePayload }
    >(({ id, data }) => OneMedAdmin.updateEmployee(id, data), {
      onSuccess: () => {
        queryClient.invalidateQueries(["employee", id]);
        openNotificationWithIcon(
          "success",
          "Xodim ma'lumotlari yangilandi",
          "Xodim ma'lumotlarini yangilash operatsiyasi muvaffaqiyatli bajarildi!"
        );
        setIsModalOpen(false);
        setEditMode(false);
      },
      onError: (err) => {
        openNotificationWithIcon(
          "error",
          err?.message,
          "Xatolik yuz berdi qaytadan urunib ko'ring iltimos!"
        );
      },
    });

  const { mutate: updateNewPasswordMutate } = useMutation<
    { success: boolean },
    Error,
    { id: string; data: { new_password: string } }
  >(({ id, data }) => OneMedAdmin.updateNewPassword(id, data), {
    onSuccess: () => {
      queryClient.invalidateQueries(["newPassword", id]);
      openNotificationWithIcon(
        "success",
        "Parol yangilandi",
        "Parolni yodda saqladingiz degan umiddaman!"
      );
      setIsModalPassOpen(false);
    },
    onError: (err) => {
      openNotificationWithIcon(
        "error",
        err?.message,
        "Xatolik yuz berdi qaytadan urunib ko'ring iltimos!"
      );
    },
  });

  useEffect(() => {
    if (employeeData?.data) {
      // const data: EmployeeProfile = employeeData.data;

      form.setFieldsValue({
        fio: employeeData.data.fio,
        username: employeeData.data.username,
        phone: employeeData.data.phone,
        role: employeeData.data.role,
        more: employeeData.data.more,
        doctor: employeeData.data.doctor
          ? {
              experience_year: employeeData.data.doctor.experience_year,
              services: employeeData.data.doctor.categories.flatMap((c) =>
                c.services.map((s) => s.id)
              ), // faqat id lar
            }
          : undefined,
      });
    }
  }, [employeeData, form]);

  // Servislarni olish

  const {
    data: servicesData,
    isFetching,
    refetch: serviceFetch,
  } = useQuery({
    queryKey: ["services", serPage], // <-- serPage qo‘shildi
    queryFn: () => OneMedAdmin.getServices(serPage, 10),
    enabled: enable,
    keepPreviousData: true, // eski data yo‘qolmasin
  });

  useEffect(() => {
    if (id) {
      serviceFetch();
    }
  }, [id]);

  const [loadingMore, setLoadingMore] = useState(false);

  const handlePopupScroll: TreeSelectProps["onPopupScroll"] = (e) => {
    const target = e.target as HTMLDivElement;

    if (
      hasMore &&
      !isFetching &&
      !loadingMore &&
      target.scrollTop + target.offsetHeight >= target.scrollHeight - 5
    ) {
      setLoadingMore(true);
      setSerPage((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (!isFetching) {
      setLoadingMore(false);
    }
  }, [isFetching]);

  // console.log(newServiceData);

  useEffect(() => {
    if (servicesData?.data?.length) {
      setTreeData2((prev) => [
        ...prev,
        ...servicesData.data.map((category) => ({
          key: `cat-${category.id}`, // unique key
          value: `${category.id}`, // value ham unique
          title: category.name,
          selectable: false,
          disabled: category.services.length === 0,
          children: category.services.map((srv) => ({
            key: srv.id, // ✅ endi bir xil
            value: srv.id,
            title: srv.name,
          })),
        })),
      ]);

      if (servicesData.data.length < 10) {
        setHasMore(false); // end of list
      }
    }
  }, [servicesData]);

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
      (id) => OneMedAdmin.deleteEmployee(id),
      {
        onSuccess: (data) => {
          console.log("Xodim o‘chirildi:", data);
          openNotificationWithIcon(
            "success",
            "O‘chirish muvaffaqiyatli",
            data.message || "Xodim bazadan o‘chirildi!"
          );

          queryClient.invalidateQueries(["employees"]);

          navigate("/employees"); // react-router-dom bo‘lsa
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

  // const takeServicesFromBack = () => setEnable(true);
  if (employeeDataLoading) {
    return (
      <div className="w-full justify-center items-center flex h-screen bg-white/20">
        <Spin indicator={<LoadingOutlined spin />} size="large" />
      </div>
    );
  }

  const employee = employeeData?.data;
  const fio = employee?.fio || "";
  const role = employee?.role || "";
  const isDoctor = role === "doctor";
  const isActive = employee?.status === "active";
  const avatarColor = getAvatarColor(employee?.id || fio);
  const categoryNames =
    employee?.doctor?.categories?.map((c) => c.name).join(", ") || "";
  const roomNumber = employee?.doctor?.room_number;
  const experienceYear = employee?.doctor?.experience_year;

  return (
    <div className="pr-[10px] md:pr-auto">
      {contextHolder}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mt-4 text-[13px]">
        <Link to="/dashboard" className="text-[#8F99A3] hover:text-[#44525C]">
          Bosh sahifa
        </Link>
        <span className="text-[#C7CED3]">/</span>
        <Link to="/employees" className="text-[#8F99A3] hover:text-[#44525C]">
          Xodimlar
        </Link>
        <span className="text-[#C7CED3]">/</span>
        <span className="font-[500] text-[#44525C]">{fio}</span>
      </div>

      {/* Profil karta */}
      <div className="border border-[#E8E8E8] bg-white rounded-[14px] overflow-hidden mt-3 mb-4">
        <div className="relative h-[90px] bg-gradient-to-r from-[#0D9488] to-[#14B8A6] overflow-hidden">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 800 90"
            preserveAspectRatio="none"
          >
            <polyline
              points="0,52 140,52 165,20 190,75 215,38 240,52 800,52"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.35"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div className="px-6 pb-5 pt-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0 -mt-12">
              <div
                className="h-[72px] w-[72px] rounded-[18px] border-4 border-white shadow-sm flex items-center justify-center font-[700] text-[22px]"
                style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
              >
                {getInitials(fio)}
              </div>
              <span
                className={`absolute bottom-0.5 right-0.5 h-[12px] w-[12px] rounded-full border-2 border-white ${
                  isActive ? "bg-[#1DC981]" : "bg-[#A9B2B8]"
                }`}
              />
            </div>
            <div className="pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[18px] md:text-[22px] font-[700] text-[#1A2430]">
                  {isDoctor ? `Dr. ${fio}` : fio}
                </h1>
                <span
                  className={`text-[11px] font-[600] px-2.5 py-0.5 rounded-full ${
                    ROLE_BADGE_COLOR[role] || "bg-[#F1F5F4] text-[#44525C]"
                  }`}
                >
                  {ROLE_LABEL[role] || role}
                </span>
                <span
                  className={`text-[11px] font-[600] px-2.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-[#E9FBF4] text-[#0D9488]"
                      : "bg-[#F1F5F4] text-[#64727B]"
                  }`}
                >
                  {isActive ? "Ishda" : "Nofaol"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#44525C]">
                {isDoctor && categoryNames && (
                  <span className="flex items-center gap-1 rounded-full border border-[#E0E6EB] px-2.5 py-1">
                    <FaStethoscope /> {categoryNames}
                  </span>
                )}
                {isDoctor && !!roomNumber && (
                  <span className="flex items-center gap-1 rounded-full border border-[#E0E6EB] px-2.5 py-1">
                    <BsDoorOpen /> Xona №{roomNumber}
                  </span>
                )}
                {isDoctor && experienceYear != null && (
                  <span className="flex items-center gap-1 rounded-full border border-[#E0E6EB] px-2.5 py-1">
                    <PiMedalLight /> Tajriba {experienceYear} yil
                  </span>
                )}
                {employee?.username && (
                  <span className="flex items-center gap-1 rounded-full border border-[#E0E6EB] px-2.5 py-1">
                    <LuAtSign /> {employee.username}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {role !== "admin" && (
              <button
                onClick={showDeleteModal}
                className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-[13px] font-[500] text-[#D4443F] bg-[#FDECEC] hover:bg-[#FBDFDF] transition-colors"
              >
                <GoTrash className="text-[15px]" />
                O'chirish
              </button>
            )}
            <button
              onClick={showModalPassword}
              className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-[13px] font-[500] text-[#B5820A] bg-[#FEF6E6] hover:bg-[#FCEDCB] transition-colors"
            >
              <BiSolidEditAlt className="text-[15px]" />
              Parolini o'zgartirish
            </button>
            <button
              onClick={showModal}
              className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-[13px] font-[500] text-white bg-[#0D9488] hover:bg-[#0C8377] transition-colors"
            >
              <BiSolidEditAlt className="text-[15px]" />
              Tahrirlash
            </button>
          </div>
        </div>
      </div>

      {/* Xodimn o'chirish */}
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
          Haqiqatan ham "{employeeData?.data.fio}" xodimni o'chirmoqchimisiz? Bu
          amal bekor qilib bo'lmaydi.
        </p>
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={() => setDeleteModal(false)}
            className="cursor-pointer border border-[#d9d9d9]  md:px-6 px-3 md:py-2 py-1.5  rounded-md md:text-[14px] text-[12px flex md:gap-2 hover:bg-[#E6F4FF] transition-all duration-150"
          >
            Bekor qilish
          </button>
          <button
            onClick={() => {
              if (!id) return;
              deletePatientMutate(id);
            }}
            className="cursor-pointer text-red-500 border-red-500 md:px-6 px-3 md:py-2 py-1.5 border rounded-md md:text-[14px] text-[12px] flex md:gap-2 hover:bg-[#ffe6e65e] transition-all duration-150"
          >
            {deletePatientLoading ? "O‘chirilmoqda..." : "O‘chirish"}
          </button>
        </div>
      </Modal>

      {/* Modal */}
      <Modal
        title="Xodim ma'lumotlarini tahrirlash"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={false}
      >
        <Card className="!border-none">
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              const payload = {
                fio: values.fio,
                username: values.username,
                phone: values.phone,
                role: values.role,
                more: values.more,
                doctor: values.doctor
                  ? {
                      experience_year: values.doctor.experience_year,
                      services: treeSelectValues, // backendga faqat id yuboriladi
                    }
                  : undefined,
              };

              updateEmployeeMutate({ id: id!, data: payload });
              //updateProfileMutate(payload); // mutationni chaqiramiz
            }}
          >
            <Form.Item label="FIO" name="fio">
              <Input disabled={!editMode} />
            </Form.Item>

            <Form.Item label="Username" name="username">
              <Input disabled={!editMode} />
            </Form.Item>

            <Form.Item label="Phone" name="phone">
              <Input disabled={!editMode} />
            </Form.Item>

            <Form.Item label="Role" name="role">
              <Input disabled={true} />
            </Form.Item>

            <Form.Item label="More" name="more">
              <Input disabled={!editMode} />
            </Form.Item>

            {employeeData?.data?.doctor && (
              <>
                <Form.Item
                  label="Experience Year"
                  name={["doctor", "experience_year"]}
                >
                  <Input type="number" disabled={!editMode} />
                </Form.Item>

                <Form.Item label="Services" name={["doctor", "services"]}>
                  <TreeSelect
                    // onClick={takeServicesFromBack}
                    disabled={!editMode}
                    showSearch
                    style={{ width: "100%" }}
                    multiple
                    placeholder="Please select"
                    allowClear
                    treeCheckable
                    onPopupScroll={handlePopupScroll}
                    treeDefaultExpandAll
                    showCheckedStrategy={TreeSelect.SHOW_CHILD}
                    onChange={(v) => {
                      setTreeSelectValues(v), console.log(v);
                    }}
                    fieldNames={{
                      label: "title",
                      value: "value", // bu yer value bilan bir xil bo‘lishi kerak
                      children: "children",
                    }}
                    treeData={treeData2}
                    popupRender={(menu) => (
                      <div className="">
                        {menu}
                        {isFetching && hasMore && (
                          <div style={{ textAlign: "center", padding: 8 }}>
                            <Spin
                              indicator={<LoadingOutlined spin />}
                              size="small"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  />
                </Form.Item>
              </>
            )}

            <div>
              {!editMode ? (
                <div
                  onClick={() => setEditMode(true)}
                  className="flex justify-center cursor-pointer items-center !w-full !h-[38px] mt-3 px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                >
                  Tahrirlash
                </div>
              ) : (
                <button
                  type="submit"
                  className="flex justify-center items-center cursor-pointer !w-full !h-[38px] mt-3 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {updateEmployeeLoading ? (
                    <Spin indicator={<LoadingOutlined spin />} />
                  ) : (
                    "Saqlash"
                  )}
                </button>
              )}
            </div>
          </Form>
        </Card>
      </Modal>

      <Modal
        title="Yangi parol o'rnatish"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalPassOpen}
        onOk={handleOkPass}
        onCancel={handleCancelPass}
        footer={false}
      >
        <Card className="!border-none">
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              const payload = {
                new_password: values.new_password,
              };

              updateNewPasswordMutate({ id: id!, data: payload });
              //updateProfileMutate(payload); // mutationni chaqiramiz
            }}
          >
            <Form.Item
              label="Yangi parol (foydalanuvchiga berish uchun yodda saqlang!)"
              name="new_password"
              rules={[
                {
                  required: true,
                  message: "Parol kiritilishi kerak!",
                },
                {
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.reject("Parol kiritilishi kerak!");
                    }
                    if (value.length < 8) {
                      return Promise.reject(
                        "Parol kamida 8 ta belgidan iborat bo‘lishi kerak!"
                      );
                    }
                    if (!/[A-Z]/.test(value)) {
                      return Promise.reject(
                        "Parolda kamida 1 ta katta harf bo‘lishi kerak!"
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input />
            </Form.Item>

            <div>
              <button
                type="submit"
                className="flex justify-center items-center !w-full !h-[38px] mt-3 px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-md transition-all cursor-pointer"
              >
                {updateEmployeeLoading ? (
                  <Spin
                    className="!text-white"
                    indicator={<LoadingOutlined spin />}
                  />
                ) : (
                  "Saqlash"
                )}
              </button>
            </div>
          </Form>
        </Card>
      </Modal>

      {/* Body qism */}
      <div className="grid grid-cols-12 gap-4">
        <div
          className={`${
            isDoctor ? "lg:col-span-4" : "lg:col-span-12"
          } col-span-12 flex flex-col gap-4`}
        >
          {/* Shaxsiy ma'lumotlar */}
          <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] p-5">
            <h3 className="flex items-center gap-2 font-[600] text-[15px] mb-4">
              <span className="p-1.5 rounded-md text-[#0D9488] bg-[#E9FBF4]">
                <LuUser />
              </span>
              Shaxsiy ma'lumotlar
            </h3>
            <div className="flex items-center gap-3 border border-[#E0E6EB] rounded-[10px] px-4 py-3">
              <BsTelephone className="text-[#8F99A3]" />
              <div>
                <p className="text-[11px] uppercase text-[#8F99A3]">
                  Telefon
                </p>
                <p className="font-[600] text-[14px]">{employee?.phone}</p>
              </div>
            </div>
          </div>

          {/* Xizmatlar */}
          {isDoctor && (
            <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 font-[600] text-[15px]">
                  <span className="p-1.5 rounded-md text-[#2D6FE0] bg-[#EAF1FF]">
                    <FaStethoscope />
                  </span>
                  Xizmatlar
                </h3>
                <button
                  onClick={showModal}
                  className="flex items-center gap-1 text-[12px] font-[600] text-[#0D9488] hover:underline cursor-pointer"
                >
                  <FiPlus /> Biriktirish
                </button>
              </div>
              {employee?.doctor?.categories?.some(
                (c) => c.services?.length
              ) ? (
                <div className="flex flex-col gap-2">
                  {employee.doctor.categories.flatMap((cat) =>
                    cat.services.map((srv) => (
                      <div
                        key={srv.id}
                        className="flex items-center justify-between border border-[#F0F2F3] rounded-[8px] px-3 py-2"
                      >
                        <span className="text-[13px] text-[#44525C]">
                          {srv.name}
                        </span>
                        <span className="text-[13px] font-[600]">
                          {srv.price.toLocaleString("uz-UZ")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-[#8F99A3]">
                  Hali xizmat biriktirilmagan
                </p>
              )}
            </div>
          )}
        </div>

        {isDoctor && (
          <div className="lg:col-span-8 col-span-12 flex flex-col gap-4">
            {/* Stat kartalar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
                <p className="text-[11px] text-[#8F99A3]">Bugun</p>
                <p className="text-[18px] font-[700]">
                  {todayPatients} bemor
                </p>
              </div>
              <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
                <p className="text-[11px] text-[#8F99A3]">Shu oy</p>
                <p className="text-[18px] font-[700]">
                  {monthPatients} bemor
                </p>
              </div>
              <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
                <p className="text-[11px] text-[#8F99A3]">Oylik tushum</p>
                <p className="text-[18px] font-[700]">
                  {formatNumber(monthRevenue)} so'm
                </p>
              </div>
              <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
                <p className="text-[11px] text-[#8F99A3]">
                  Tashriflar (30 kun)
                </p>
                <p className="text-[18px] font-[700]">
                  {employee?.doctor?.patients_stats?.total_visits ?? 0}
                </p>
              </div>
            </div>

            {/* Qabul qilingan bemorlar */}
            <div className="border bg-[#fff] border-[#E8E8E8] p-[25px] rounded-[10px]">
              <div className="mb-2">
                <h3 className="text-[#0D9488] text-[14px] md:text-[16px]">
                  Qabul qilingan bemorlar
                </h3>
                <h2 className="md:text-[24px] text-[20px] font-[600]">
                  {dailyStats.reduce(
                    (acc, item) => acc + Number(item.patient_count),
                    0
                  )}
                  <span className="ms-1 text-[13px] font-[400] text-[#8F99A3]">
                    bemor (oxirgi 30 kun) · o'rtacha {avgPatientsPerDay.toFixed(1)}/kun
                  </span>
                </h2>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F0F2F3"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#8F99A3" }}
                    tickFormatter={(date: string) => {
                      const parts = date.split("-");
                      return `${parts[2]}/${parts[1]}`; // 15/07
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#8F99A3" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#F5F7F8" }}
                    formatter={(value) => [`${value} bemor`, "Qabul"]}
                    labelFormatter={(label) => {
                      const parts = label.split("-");
                      return `${parts[2]}/${parts[1]}`; // "15/07"
                    }}
                  />
                  {avgPatientsPerDay > 0 && (
                    <ReferenceLine
                      y={avgPatientsPerDay}
                      stroke="#D0D5DA"
                      strokeDasharray="4 4"
                      ifOverflow="extendDomain"
                    />
                  )}
                  <Bar dataKey="patients" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.date === todayStr ? "#0D9488" : "#99E2D7"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Kunlik tushum */}
            <div className="border bg-[#fff] border-[#E8E8E8] p-[25px] rounded-[10px]">
              <div className="mb-2">
                <h3 className="text-[#2D6FE0] text-[14px] md:text-[16px]">
                  Shifokor keltirgan kunlik tushum
                </h3>
                <h2 className="md:text-[24px] text-[20px] font-[600]">
                  {dailyStats.reduce(
                    (acc, item) => acc + Number(item.revenue || 0),
                    0
                  )}
                  <span className="ms-1 text-[13px] font-[400] text-[#8F99A3]">
                    so'm (oxirgi 30 kun)
                  </span>
                </h2>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart
                  data={chartData2}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D6FE0" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#2D6FE0" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#8F99A3" }}
                    tickFormatter={(date: string) => {
                      const parts = date.split("-");
                      return `${parts[2]}/${parts[1]}`; // faqat kun/oy
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#8F99A3" }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F0F2F3"
                  />

                  <Tooltip
                    formatter={(value) => [`${value} so'm`, "Daromad"]}
                    labelFormatter={(label) => {
                      const parts = label.split("-");
                      return `${parts[2]}/${parts[1]}`; // 15/07
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2D6FE0"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
