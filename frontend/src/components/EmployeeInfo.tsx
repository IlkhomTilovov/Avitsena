import { BiSolidEditAlt } from "react-icons/bi";
import { IoMdArrowBack } from "react-icons/io";
import { Link, useNavigate, useParams } from "react-router-dom";
// import { IoTrashOutline } from "react-icons/io5";
import { FaStethoscope } from "react-icons/fa6";
import { PiMedalLight } from "react-icons/pi";
import { LuUser } from "react-icons/lu";
import { BsTelephone } from "react-icons/bs";
import {
  Area,
  AreaChart,
  CartesianGrid,
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

  return (
    <div className="pr-[10px] md:pr-auto">
      <div className="flex items-center justify-between my-4">
        {/* Orqaga qaytish */}
        {contextHolder}
        <div className="flex items-center gap-4">
          <Link
            to="/employees"
            className=" items-center hidden md:flex gap-1 px-6 py-2.5 text-[14px] font-[500] rounded-md hover:bg-[#E6F4FF]"
          >
            <IoMdArrowBack className="text-[16px]" />
            Orqaga
          </Link>

          {/* Patient ismi + avatar */}
          <div className="flex items-center gap-3">
            <div>
              <h2 className="md:text-[22px] text-[18px] font-[600] mb-[-5px]">
                {employeeData?.data.role === "admin"
                  ? "Admin"
                  : employeeData?.data.role === "registrator"
                  ? "Registrator"
                  : employeeData?.data.role === "doctor"
                  ? "Doctor"
                  : ""}{" "}
                ma'lumotlari
              </h2>
              <p className="text-[#9D99AB] font-[300] md:text-[14px] text-[12px]">
                To'liq ma'lumot va jadval
              </p>
            </div>
          </div>
        </div>

        {/* Edit tugmasi */}
        <div className="flex gap-3 flex-col-reverse md:flex-row">
          {employeeData?.data.role === "admin" ? (
            ""
          ) : (
            <button
              onClick={showDeleteModal}
              className="cursor-pointer text-red-500 border-red-500 md:px-6 px-3 md:py-2 py-1.5 border  rounded-md md:text-[14px] text-[12px] flex md:gap-2 hover:bg-[#ff121218] transition-all duration-150"
            >
              <GoTrash className="md:text-[18px] text-[16px]" />
              O'chirish
            </button>
          )}
          <button
            onClick={showModalPassword}
            className="cursor-pointer text-yellow-500 border-yellow-500 md:px-6 px-3 md:py-2 py-1.5 border  rounded-md md:text-[14px] text-[12px] flex md:gap-2 hover:bg-[#ffbc1218] transition-all duration-150"
          >
            <BiSolidEditAlt className="md:text-[18px] text-[16px]" />
            Parolini o'zgartirish
          </button>
          <button
            onClick={showModal}
            className="cursor-pointer text-blue-500 border-blue-500 md:px-6 px-3 md:py-2 py-1.5 border  rounded-md md:text-[14px] text-[12px flex md:gap-2 hover:bg-[#E6F4FF] transition-all duration-150"
          >
            <BiSolidEditAlt className="md:text-[18px] text-[16px]" />
            Tahrirlash
          </button>

          {/* <button className="cursor-pointer px-6 py-2 border border-red-500 text-red-500 rounded-md text-[14px] flex gap-2 hover:bg-red-500/10 transition-all duration-150">
            <IoTrashOutline className="text-[18px]" />
            O'chirish
          </button> */}
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
        <div className="md:col-span-4 col-span-12">
          <div className="border bg-[#fff] border-[#E8E8E8]  rounded-[10px]">
            <div className="bg-[#1173D4] rounded-t-[10px] px-[20px] py-[25px]">
              <h4 className="md:text-[20px] text-[16px] font-[600] text-white">
                {employeeData?.data.fio}
              </h4>
              <p className="md:text-[20px] text-[16px] font-[500] text-white/40">
                ID: {employeeData?.data.username}
              </p>
              <span className="inline-flex items-center mt-2 md:text-[16px] text-[14px] text-white px-[10px] py-[4px] gap-1 rounded-xl bg-[#418FDD]">
                {" "}
                <FaStethoscope /> roles.{employeeData?.data.role}
              </span>
              <div className="md:text-[16px] text-[14px] text-white mt-2">
                <span className="flex items-center gap-1">
                  <PiMedalLight /> tajriba
                </span>
              </div>
            </div>
            <div className="px-[20px] py-[25px]">
              <div className="flex items-start gap-2  border-b border-b-[#d9d9d9] pb-6 mb-6">
                <div className="p-2 rounded-md text-[#0079f3] bg-[#bed2e7]">
                  <LuUser />
                </div>
                <div className="w-full">
                  <h5 className="font-[600] md:text-[18px] text-[16px] mt-1">
                    Mutahasislik
                  </h5>
                  <div className="w-full flex flex-col gap-2.5 mt-4">
                    <div className="w-full">
                      {employeeData?.data?.doctor?.categories?.map((item) => (
                        <div key={item.id} className="mb-2 w-full">
                          {/* Kategoriya nomi */}
                          <h3 className="text-lg font-[500] text-[#2B7FFF]">
                            {item.name}
                          </h3>

                          {/* Servis sarlavha */}
                          <p className="uppercase text-sm text-gray-500 mt-1 mb-2">
                            Servislar:
                          </p>

                          {/* Servislar ro'yxati */}
                          <ul className="space-y-2">
                            {item.services?.map((service, index) => (
                              <li
                                key={service.id}
                                className="flex items-centter gap-2 "
                              >
                                <span className="text-[#b3b3b3]">
                                  {index + 1}.
                                </span>
                                <span className="font-medium">
                                  {service.name}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2  ">
                <div className="p-2 rounded-md text-[#010306] bg-[#d6d8db]">
                  <BsTelephone />
                </div>
                <div className="w-full">
                  <h5 className="font-[600] md:text-[18px] text-[16px] mt-1">
                    Bog'lanish
                  </h5>
                  <div className="border border-[#d4d4d4] rounded-xl flex items-center py-3 px-4 !w-full bg-[#EFFBF6] gap-4 mt-4">
                    <BsTelephone className="text-[17px]" />
                    <div className="">
                      <span className="uppercase md:text-[16px] text-[14px] text-[#8FA9C7]">
                        Telefon
                      </span>
                      <p className="font-[600]">{employeeData?.data.phone}</p>
                    </div>
                  </div>

                  {employeeData?.data?.doctor?.room_number && (
                    <div className="border border-[#d4d4d4] rounded-xl flex items-center py-3 px-4 !w-full bg-[#effafb] gap-4 mt-4">
                      <BsDoorOpen className="text-[17px]" />
                      <div className="">
                        <span className="uppercase md:text-[16px] text-[14px] text-[#8fc4c7]">
                          Xona raqami
                        </span>
                        <p className="font-[600]">
                          {employeeData?.data?.doctor?.room_number}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-8 col-span-12">
          <div className="border bg-[#fff] border-[#E8E8E8] p-[25px] rounded-[10px] mb-4">
            <div className="mb-2">
              <h3 className="text-[#0079f3] text-[14px] md:text-[16px]">
                Kunlik qabul qilingan bemorlar
              </h3>
              <h2 className="md:text-[24px] text-[20px] font-[600]">
                {employeeData?.data?.doctor?.patients_stats?.daily_stats.reduce(
                  (acc, item) => acc + Number(item.patient_count),
                  0
                )}
                <span className="ms-1">bemor (oxirgi 30 kun)</span>
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorPatients"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#4a90e2" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4a90e2" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="date"
                  tickFormatter={(date: string) => {
                    const parts = date.split("-");
                    return `${parts[2]}/${parts[1]}`; // 15/07
                  }}
                />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />

                {/* Tooltipni custom qildik */}
                <Tooltip
                  formatter={(value) => [`Qabul: ${value} bemor`, ""]}
                  labelFormatter={(label) => {
                    // label "2025-07-15" bo'lsa → ["2025","07","15"]
                    const parts = label.split("-");
                    return `${parts[2]}/${parts[1]}`; // "15/07"
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="patients"
                  stroke="#4a90e2"
                  fillOpacity={1}
                  fill="url(#colorPatients)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="border bg-[#fff] border-[#E8E8E8] p-[25px] rounded-[10px]">
            <div className="mb-2">
              <h3 className="text-[#0079f3] text-[14px] md:text-[16px">
                Shifokor keltirgan kunlik tushum
              </h3>
              <h2 className="md:text-[24px] text-[20px] font-[600]">
                {employeeData?.data?.doctor?.patients_stats?.daily_stats.reduce(
                  (acc, item) => acc + Number(item.revenue.toFixed(1)),
                  0
                )}
                <span className="ms-1">so'm (oxirgi 30 kun)</span>
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart
                data={chartData2}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="date"
                  tickFormatter={(date: string) => {
                    const parts = date.split("-");
                    return `${parts[2]}/${parts[1]}`; // faqat kun/oy
                  }}
                />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                <CartesianGrid strokeDasharray="3 3" />

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
                  stroke="#4CAF50"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
