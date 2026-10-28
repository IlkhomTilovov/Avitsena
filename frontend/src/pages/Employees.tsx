import { FiPlus, FiDownload, FiCalendar, FiGrid, FiList } from "react-icons/fi";
import {
  AutoComplete,
  Card,
  Form,
  Input,
  Modal,
  notification,
  Pagination,
  Select,
  Spin,
  TreeSelect,
  TreeSelectProps,
} from "antd";
import { Link } from "react-router-dom";
import { LuUser } from "react-icons/lu";
import { BsTelephone } from "react-icons/bs";
import { FaUserDoctor } from "react-icons/fa6";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { baseApi, OneMedAdmin } from "../queries/query";
import { LoadingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "../App.css";
import axios from "axios";

type EmployeeResponseType = {
  id: string;
  fio: string;
  username: string;
  role: string;
  phone: string;
  status: string;
  services?: string[];
  specialty?: string | null;
  today_count?: number;
  month_count?: number;
  last_login?: string | null;
  doctor?: { experience_year: number | null; room_number: number | null } | null;
};

const ROLE_LABEL: Record<string, string> = {
  doctor: "Shifokor",
  registrator: "Registrator",
  admin: "Administrator",
};

const ROLE_BADGE_COLOR: Record<string, string> = {
  doctor: "bg-[#EAF1FF] text-[#2D6FE0]",
  registrator: "bg-[#FEF6E6] text-[#B5820A]",
  admin: "bg-[#EFEAFB] text-[#7A5BD8]",
};

const AVATAR_COLORS = [
  { bg: "#E7F0FA", text: "#2A81D8" },
  { bg: "#FCEAF2", text: "#D6468A" },
  { bg: "#FEF3E0", text: "#D98A1B" },
  { bg: "#EFEAFB", text: "#7A5BD8" },
  { bg: "#E9FBF4", text: "#0D9488" },
  { bg: "#FDECEC", text: "#D3453F" },
];

function getAvatarColor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(fio: string) {
  const parts = fio.trim().split(/\s+/);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

function formatLastLogin(lastLogin?: string | null) {
  if (!lastLogin) return "Hali kirmagan";
  const diffMinutes = dayjs().diff(dayjs(lastLogin), "minute");
  if (diffMinutes < 15) return "Hozir";
  return dayjs(lastLogin).format("YYYY-MM-DD HH:mm");
}
type EmployeeObjType = {
  fio: string;
  username: string;
  password: string;
  role: string;
  phone: string;
  services?: string[];
};

type Service = {
  id: string;
  name: string;
  price: number;
};

type ServiceCategory = {
  id: string;
  name: string;
  services: Service[];
};

export default function Employees() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const per_page = 10;

  // natification

  type NotificationType = "success" | "info" | "warning" | "error";

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

  const [searchText, setSearchText] = useState("");
  const [empStatus, setEmpStatus] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeResponseType | null>(null);

  useEffect(() => {
    setSearchText("");
  }, []);

  const { data: clinicStats } = useQuery({
    queryKey: ["allStat"],
    queryFn: () => OneMedAdmin.allStat(),
    staleTime: Infinity,
  });

  const staffStats = clinicStats?.data?.staff_stats;

  // Xodimlar olish
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["employees", page, per_page, searchText, role, empStatus],
    queryFn: () =>
      OneMedAdmin.getEmployeesFilter(page, per_page, searchText, role, empStatus),
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  const options =
    employeesData?.data?.map((item: EmployeeResponseType) => ({
      value: item.fio, // input ichida chiqadigan text
      label: item.fio, // dropdown label
      key: item.id, // unique id
      item, // butun obyekt
    })) || [];

  const handleSearch = (val: string) => {
    setSearchText(val);
    setSelectedEmployee(null);
  };

  const handleSelect = (_val: string, option: any) => {
    setSelectedEmployee(option.item); // to‘liq objectni saqlaymiz
  };

  // Servislarni olish

  const [enable, setEnable] = useState(false);
  const [serPage, setSerPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [treeData2, setTreeData2] = useState<any[]>([]);

  const { data: servicesData, isFetching } = useQuery({
    queryKey: ["services", serPage], // <-- serPage qo‘shildi
    queryFn: () => OneMedAdmin.getServices(serPage, 10),
    enabled: enable,
    keepPreviousData: true, // eski data yo‘qolmasin
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const handlePopupScroll: TreeSelectProps["onPopupScroll"] = (e) => {
    const target = e.target as HTMLDivElement;

    if (
      hasMore &&
      !isFetching &&
      target.scrollTop + target.offsetHeight >= target.scrollHeight - 5
    ) {
      setSerPage((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (servicesData?.data?.length) {
      setTreeData2((prev) => {
        const existingValues = new Set<string>();

        // eski + yangi node'larni qo‘shib, dublikatlarni chiqarib tashlaymiz
        const merged = [
          ...prev,
          ...servicesData.data.map((category: ServiceCategory) => ({
            value: `cat-${category.id}`,
            title: category.name,
            selectable: false,
            disabled: category.services.length === 0,
            children: category.services.map((srv) => ({
              value: `${srv.id}`,
              title: <div>{srv.name}</div>,
            })),
          })),
        ];

        // unique filter
        const unique = merged.filter((node) => {
          if (existingValues.has(node.value)) return false;
          existingValues.add(node.value);
          return true;
        });

        return unique;
      });

      if (servicesData.data.length < 10) {
        setHasMore(false); // end of list
      }
    }
  }, [servicesData]);

  const takeServicesFromBack = () => setEnable(true);

  // Xodim qo‘shish
  const queryClient = useQueryClient();
  const { mutate: addEmployeMutate, isLoading: addEmpLoading } = useMutation<
    EmployeeResponseType,
    Error,
    EmployeeObjType
  >((obj) => OneMedAdmin.addEmployee(obj), {
    onSuccess: () => {
      queryClient.invalidateQueries(["employees"]); // faqat shu query refresh bo‘ladi
      openNotificationWithIcon(
        "success",
        "Xodim qo'shildi.",
        "Xodim qo'shish operatsiyasi muvaffaqiyatli bajarildi!"
      );
      setIsModalOpen(false);
    },
    onError: (error) => {
      openNotificationWithIcon(
        "error",
        error.message,
        "Xatolik yuz berdi qaytadan urunib ko'ring iltimos!"
      );
    },
  });

  const addEmployeeFunc = (value: EmployeeObjType) => {
    addEmployeMutate(value);
  };

  const [showService, setShowServices] = useState(false);
  const handleRoleChange = (value: string) => {
    setShowServices(value === "doctor");
  };

  if (isLoading) {
    return (
      <div className="absolute left-0 top-0 z-[9999] w-full h-screen flex justify-center items-center bg-white/20 backdrop:blur-2xl">
        <Spin indicator={<LoadingOutlined spin />} size="large" />
      </div>
    );
  }
  return (
    <div className="pr-[10px] md:pr-auto">
      {contextHolder}
      {/* Header */}
      <div className="flex md:flex-row flex-col md:items-center items-start justify-between gap-3 mt-[30px] mb-4">
        <div>
          <h1 className="md:text-[22px] text-[18px] font-[600]">
            Xodimlar boshqaruvi
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#8F99A3]">
            Klinika xodimlari va ularning ish jadvallarini boshqarish
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const rows = employeesData?.data || [];
              if (!rows.length) return;
              const header = ["F.I.O", "Username", "Rol", "Telefon", "Holat"];
              const csvRows = rows.map((r: EmployeeResponseType) => [
                r.fio,
                r.username,
                ROLE_LABEL[r.role] || r.role,
                r.phone,
                r.status === "active" ? "Faol" : "Nofaol",
              ]);
              const csvContent = [header, ...csvRows]
                .map((row: string[]) =>
                  row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                )
                .join("\n");
              const blob = new Blob(["﻿" + csvContent], {
                type: "text/csv;charset=utf-8;",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `xodimlar_${dayjs().format("YYYY-MM-DD")}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#E0E6EB] text-[13px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            <FiDownload /> Eksport
          </button>
          <button
            onClick={() => alert("Umumiy jadval tez orada qo'shiladi")}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#E0E6EB] text-[13px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            <FiCalendar /> Umumiy jadval
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex gap-2 text-[14px] md:text-[16px] items-center py-2.5 px-4 rounded-[10px] text-white cursor-pointer bg-[#0D9488] hover:bg-[#0C8377] transition-colors"
          >
            <FiPlus className="md:text-[20px] text-[14px] hidden md:block" />
            Xodim qo'shish
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid md:grid-cols-4 grid-cols-2 gap-3 mb-4">
        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#8F99A3]">Jami xodimlar</p>
            <p className="text-[18px] font-[700]">{staffStats?.total ?? "—"}</p>
          </div>
          <span className="text-[11px] font-[600] text-[#0D9488] bg-[#E9FBF4] px-2 py-1 rounded-full">
            {employeesData?.data?.filter(
              (e: EmployeeResponseType) => e.status === "active"
            ).length ?? 0}{" "}
            ishda
          </span>
        </div>
        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
          <p className="text-[11px] text-[#8F99A3]">Shifokorlar</p>
          <p className="text-[18px] font-[700]">{staffStats?.doctor_count ?? "—"}</p>
        </div>
        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
          <p className="text-[11px] text-[#8F99A3]">Registratorlar</p>
          <p className="text-[18px] font-[700]">{staffStats?.registrator_count ?? "—"}</p>
        </div>
        <div className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] px-4 py-3">
          <p className="text-[11px] text-[#8F99A3]">Administratorlar</p>
          <p className="text-[18px] font-[700]">{staffStats?.admin_count ?? "—"}</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="px-6 py-5 border border-[#E0E6EB] rounded-[10px] flex md:flex-row flex-col items-center gap-3 mb-4">
        <Form className="md:flex-1 !w-full">
          <Form.Item name="search" className="!m-0 relative flex-1">
            <AutoComplete
              options={options}
              onSelect={handleSelect}
              onSearch={handleSearch}
              placeholder="Ism yoki telefon bo'yicha qidiring..."
              className="!w-full !h-[40px]"
              notFoundContent="Xodim topilmadi!"
            />
          </Form.Item>
        </Form>
        <div className="flex items-center gap-2 flex-wrap">
          {["", "doctor", "registrator", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-3 py-2 border border-[#eaeaea] rounded-[6px] ${
                role === r ? "bg-[#0D9488] text-white border-[#0D9488]" : "text-black"
              } cursor-pointer text-[14px] md:h-[41px] hover:shadow-md transition-all duration-150`}
            >
              {r === ""
                ? `Barchasi ${staffStats?.total ?? ""}`
                : r === "doctor"
                ? `Shifokorlar ${staffStats?.doctor_count ?? ""}`
                : r === "registrator"
                ? `Registratorlar ${staffStats?.registrator_count ?? ""}`
                : `Adminlar ${staffStats?.admin_count ?? ""}`}
            </button>
          ))}
        </div>
        <Select
          value={empStatus || undefined}
          onChange={(v) => setEmpStatus(v || "")}
          placeholder="Barcha holatlar"
          allowClear
          className="!w-full md:!w-[170px] !h-[40px]"
          options={[
            { value: "active", label: "Faol" },
            { value: "inactive", label: "Nofaol" },
          ]}
        />
        <div className="flex items-center gap-1 border border-[#E0E6EB] rounded-[8px] p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`w-[32px] h-[32px] flex items-center justify-center rounded-[6px] cursor-pointer ${
              viewMode === "grid" ? "bg-[#0D9488] text-white" : "text-[#8F99A3]"
            }`}
          >
            <FiGrid />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`w-[32px] h-[32px] flex items-center justify-center rounded-[6px] cursor-pointer ${
              viewMode === "list" ? "bg-[#0D9488] text-white" : "text-[#8F99A3]"
            }`}
          >
            <FiList />
          </button>
        </div>
      </div>

      <div className="mt-[14px]">
        {(selectedEmployee ? [selectedEmployee] : employeesData?.data || [])
          .length === 0 ? (
          <div className="px-6 py-10 border border-[#E0E6EB] rounded-[10px] bg-[#fff] text-center text-[#8F99A3]">
            Xodim topilmadi
          </div>
        ) : viewMode === "list" ? (
          (selectedEmployee ? [selectedEmployee] : employeesData?.data || []).map(
            (item: EmployeeResponseType) => (
              <Link
                key={item.id}
                to={`${item.id}`}
                className="px-6 py-4 border border-[#E0E6EB] flex items-center justify-between rounded-[10px] bg-[#fff] mb-3 hover:shadow-md transition-all duration-150"
              >
                <div className="flex items-center gap-3">
                  <div className="md:w-[50px] md:h-[50px] w-[35px] h-[35px] flex justify-center items-center rounded-full bg-[#E7F0FA] text-[#2A81D8] md:text-[24px] text-[20px]">
                    <LuUser />
                  </div>
                  <div>
                    <h3 className="md:text-[18px] text-[14px] font-[600]">
                      {item.fio}
                    </h3>
                    <p className="md:text-[14px] text-[12px] text-[#8b8b8b] flex gap-2">
                      <BsTelephone /> {item.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-2.5 py-1 rounded-full text-[#5AA6F2] bg-[#EEF6FD] flex items-center text-[14px] gap-1.5">
                    <FaUserDoctor /> {ROLE_LABEL[item.role] || item.role}
                  </button>
                </div>
              </Link>
            )
          )
        ) : (
          <div className="grid md:grid-cols-3 grid-cols-1 gap-3">
            {(selectedEmployee ? [selectedEmployee] : employeesData?.data || []).map(
              (item: EmployeeResponseType) => {
                const avatarColor = getAvatarColor(item.id);
                const isActive = item.status === "active";
                const isAdmin = item.role === "admin";

                return (
                  <div
                    key={item.id}
                    className="border bg-[#fff] border-[#E8E8E8] rounded-[10px] p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div
                            className="w-[46px] h-[46px] flex items-center justify-center rounded-full font-[700] text-[14px]"
                            style={{
                              backgroundColor: avatarColor.bg,
                              color: avatarColor.text,
                            }}
                          >
                            {getInitials(item.fio)}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-[10px] h-[10px] rounded-full border-2 border-white ${
                              isActive ? "bg-[#1DC981]" : "bg-[#A9B2B8]"
                            }`}
                          />
                        </div>
                        <div>
                          <h3 className="text-[14px] font-[600]">{item.fio}</h3>
                          <p className="text-[12px] text-[#8F99A3]">
                            {item.role === "doctor"
                              ? item.specialty || "Shifokor"
                              : item.role === "registrator"
                              ? "Qabulxona"
                              : "Administrator"}
                          </p>
                          <span
                            className={`inline-block mt-1 text-[10px] font-[600] px-2 py-0.5 rounded-full ${
                              ROLE_BADGE_COLOR[item.role] || "bg-[#F1F5F4] text-[#44525C]"
                            }`}
                          >
                            {ROLE_LABEL[item.role] || item.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#F0F2F3] mt-3 pt-3 flex items-center justify-between text-[12px] text-[#44525C]">
                      <span className="flex items-center gap-1.5">
                        <BsTelephone className="text-[#8F99A3]" /> {item.phone}
                      </span>
                      <span
                        className={`text-[11px] font-[600] px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-[#E9FBF4] text-[#0D9488]"
                            : "bg-[#F1F5F4] text-[#64727B]"
                        }`}
                      >
                        {isActive ? "Ishda" : "Nofaol"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {isAdmin ? (
                        <>
                          <div className="bg-[#F9FAFB] rounded-[8px] px-2 py-2 text-center">
                            <p className="text-[10px] text-[#8F99A3]">Xodimlar</p>
                            <p className="text-[13px] font-[700]">
                              {staffStats?.total ?? "—"}
                            </p>
                          </div>
                          <div className="bg-[#F9FAFB] rounded-[8px] px-2 py-2 text-center">
                            <p className="text-[10px] text-[#8F99A3]">Bemorlar</p>
                            <p className="text-[13px] font-[700]">
                              {clinicStats?.data?.patients_stats?.total_patients ?? "—"}
                            </p>
                          </div>
                          <div className="bg-[#F9FAFB] rounded-[8px] px-2 py-2 text-center">
                            <p className="text-[10px] text-[#8F99A3]">Kirish</p>
                            <p className="text-[11px] font-[700]">
                              {formatLastLogin(item.last_login)}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-[#F9FAFB] rounded-[8px] px-2 py-2 text-center">
                            <p className="text-[10px] text-[#8F99A3]">Bugun</p>
                            <p className="text-[13px] font-[700]">
                              {item.today_count ?? 0} bemor
                            </p>
                          </div>
                          <div className="bg-[#F9FAFB] rounded-[8px] px-2 py-2 text-center col-span-2">
                            <p className="text-[10px] text-[#8F99A3]">Shu oy</p>
                            <p className="text-[13px] font-[700]">
                              {item.month_count ?? 0} bemor
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Link
                        to={`${item.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 border border-[#E0E6EB] rounded-[8px] py-2 text-[12px] font-[500] text-[#44525C] hover:bg-[#F9FAFB]"
                      >
                        <LuUser /> Profil
                      </Link>
                      <button
                        onClick={() => alert("Ish jadvali tez orada qo'shiladi")}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#E9FBF4] rounded-[8px] py-2 text-[12px] font-[500] text-[#0D9488] cursor-pointer"
                      >
                        <FiCalendar /> Ish jadvali
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* Pagination */}
        {employeesData?.meta?.total_items > 10 && !selectedEmployee && (
          <div className="px-6 py-4 border border-[#E0E6EB] flex items-center justify-end rounded-[10px] bg-[#fff] mb-5 mt-3">
            <Pagination
              current={page}
              pageSize={10}
              onChange={(p) => setPage(p)}
              total={employeesData?.meta.total_items}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        title="Xodim qo'shish"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={false}
      >
        {addEmpLoading ? (
          <div className="w-full h-[500px] flex justify-center items-center">
            <Spin indicator={<LoadingOutlined spin />} size="large" />
          </div>
        ) : (
          <Card className="!border-none">
            <Form onFinish={addEmployeeFunc} layout="vertical">
              <Form.Item
                name="fio"
                label="Familiya Ism Sharif"
                rules={[
                  {
                    required: true,
                    message: "Familiya Ism Sharif kiritilishi kerak!",
                  },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="username"
                label="Username (username oldin ishlatilmagan bo'lishi kerak)"
                rules={[
                  {
                    required: true,
                    message: "Username kiritilishi kerak!",
                  },
                  {
                    validator: async (_, value) => {
                      if (!value) return Promise.resolve();

                      try {
                        const response = await axios.post(
                          `${baseApi}/v1/users/check?value=${encodeURIComponent(
                            value
                          )}`
                        );

                        if (response.data.data.is_exists) {
                          return Promise.reject(
                            "Bu username allaqachon ishlatilgan!"
                          );
                        }
                        return Promise.resolve();
                      } catch (err) {
                        return Promise.reject("Server bilan aloqa xatosi!");
                      }
                    },
                  },
                ]}
              >
                <Input
                  placeholder="Username kiriting"
                  onKeyDown={(e) => {
                    if (e.key === " ") {
                      e.preventDefault(); // probel bosilishini bloklash
                    }
                  }}
                  onChange={(e) => {
                    // foydalanuvchi copy-paste qib yubormasin
                    e.target.value = e.target.value.replace(/\s/g, "");
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password (yodda saqlang)"
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
                <Input.Password />
              </Form.Item>
              <Form.Item
                name="role"
                label="Role"
                rules={[
                  {
                    required: true,
                    message: "Role tanlanishi kerak!",
                  },
                ]}
              >
                <Select
                  onChange={handleRoleChange}
                  options={[
                    { value: "admin", label: "Admin" },
                    { value: "doctor", label: "Shifokor" },
                    { value: "registrator", label: "Registrator" },
                  ]}
                />
              </Form.Item>

              {showService && (
                <>
                  <Form.Item name={["doctor", "services"]} label="Servislar">
                    <TreeSelect
                      onClick={takeServicesFromBack}
                      showSearch
                      style={{ width: "100%" }}
                      multiple
                      placeholder="Please select"
                      allowClear
                      treeCheckable
                      onPopupScroll={handlePopupScroll}
                      treeDefaultExpandAll
                      showCheckedStrategy={TreeSelect.SHOW_CHILD}
                      onChange={(v) => console.log(v)}
                      treeData={treeData2}
                      popupRender={(menu) => (
                        <>
                          {menu}
                          {isFetching && hasMore && (
                            <div style={{ textAlign: "center", padding: 8 }}>
                              <Spin
                                indicator={<LoadingOutlined spin />}
                                size="small"
                              />
                            </div>
                          )}
                        </>
                      )}
                    />
                  </Form.Item>
                  <Form.Item
                    name={["doctor", "room_number"]}
                    label="Xona raqami"
                  >
                    <Input type="number" />
                  </Form.Item>
                </>
              )}

              <Form.Item
                name="phone"
                label="Tel raqam"
                rules={[
                  {
                    required: true,
                    message: "Telefon raqam kiritilishi kerak!",
                  },
                  {
                    validator: async (_, value) => {
                      if (!value) return Promise.resolve();

                      const regex = /^\+998\d{9}$/;
                      if (!regex.test(value)) {
                        return Promise.reject(
                          "Telefon raqam +998 bilan 12 ta belgi bo‘lishi kerak!"
                        );
                      }

                      try {
                        const response = await axios.post(
                          `${baseApi}/v1/users/check?value=${encodeURIComponent(
                            value
                          )}`
                        );

                        if (response.data.data.is_exists) {
                          return Promise.reject(
                            "Bu raqam allaqachon ishlatilgan!"
                          );
                        }
                        return Promise.resolve();
                      } catch (err) {
                        return Promise.reject("Server bilan aloqa xatosi!");
                      }
                    },
                  },
                ]}
              >
                <Input placeholder="+998XXXXXXXXX" />
              </Form.Item>

              <div className="flex justify-end gap-3">
                <button className="w-full mt-3 px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-md transition-all cursor-pointer">
                  Saqlash
                </button>
              </div>
            </Form>
          </Card>
        )}
      </Modal>
    </div>
  );
}
