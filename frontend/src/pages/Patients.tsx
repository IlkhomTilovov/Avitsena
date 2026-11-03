import { AutoComplete, DatePicker, Dropdown, Empty, Form, Input, Pagination, Select, Spin } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { BsTelephone, BsThreeDotsVertical } from "react-icons/bs";
import { LuSearch, LuUsers, LuActivity, LuUserX, LuUserPlus } from "react-icons/lu";
import { FiDownload, FiUpload, FiPlus, FiEye } from "react-icons/fi";
import { useQuery } from "react-query";
import { LoadingOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { AvitcenaAdmin } from "../queries/query";
import DashboardCard from "../components/DashboardCard";

type PatientSearchItem = {
  id: string;
  code: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  gender: "male" | "female";
  status: string;
  date_of_birth: string;
  last_visit_date: string | null;
  last_visit_doctor: string | null;
  today_visit_status: "pending" | "in_progress" | "cancelled" | "completed" | null;
  visit_count: number;
  created_at: string;
};

type PaginationMeta = {
  total_pages: number;
  total_items: number;
  current_page: number;
};

type PatientSearchResponse = {
  success: boolean;
  message: string;
  data: PatientSearchItem[];
  meta: PaginationMeta;
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

function getInitials(first: string, last: string) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
}

function isNewThisMonth(createdAt: string) {
  const created = dayjs(createdAt);
  const now = dayjs();
  return created.year() === now.year() && created.month() === now.month();
}

function getStatusBadge(item: PatientSearchItem) {
  if (item.status === "inactive") {
    return { label: "Nofaol", dot: "#A9B2B8", bg: "#F1F3F4", text: "#64727B" };
  }
  if (item.today_visit_status === "pending") {
    return { label: "Kutilmoqda", dot: "#E0A82E", bg: "#FEF6E6", text: "#B5820A" };
  }
  if (item.today_visit_status === "in_progress") {
    return { label: "Davolanmoqda", dot: "#2D80FF", bg: "#EAF1FF", text: "#2D6FE0" };
  }
  return { label: "Faol", dot: "#1DC981", bg: "#E9FBF4", text: "#0D9488" };
}

export default function Patients() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const per_page = 10;
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState("");
  const [doctorId, setDoctorId] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<Dayjs | null>(null);
  const [selectedPatient, setSelectedPatient] =
    useState<PatientSearchItem | null>(null);

  const { data, isLoading } = useQuery<PatientSearchResponse>({
    queryKey: ["patients", page, per_page, searchText, status, doctorId, month?.format("YYYY-MM")],
    queryFn: () =>
      AvitcenaAdmin.getPatientsAll(
        page,
        per_page,
        searchText,
        status,
        undefined,
        doctorId,
        month ? month.format("YYYY-MM") : undefined
      ),
    keepPreviousData: true,
  });

  const { data: statsData } = useQuery({
    queryKey: ["patients-stats"],
    queryFn: () => AvitcenaAdmin.getPatientsStats(),
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors-for-filter"],
    queryFn: () => AvitcenaAdmin.getEmployeesFilter(1, 100, undefined, "doctor"),
  });

  const stats = statsData?.data;

  const doctorOptions = (doctorsData?.data || []).map((d: any) => ({
    value: d.id,
    label: d.fio,
  }));

  const options =
    data?.data.map((item) => ({
      value: `${item.first_name} ${item.last_name}`,
      label: `${item.first_name} ${item.last_name}`,
      key: item.id,
      item,
    })) || [];

  useEffect(() => {
    setSearchText("");
  }, []);

  const handleSearch = (val: string) => {
    setSearchText(val);
    setSelectedPatient(null);
    setPage(1);
  };

  const handleSelect = (_val: string, option: any) => {
    setSelectedPatient(option.item);
  };

  const handleExport = () => {
    const rows = data?.data || [];
    if (!rows.length) return;

    const header = ["ID", "Ism", "Familiya", "Telefon", "Jinsi", "Tug'ilgan sana", "Holat", "So'nggi tashrif", "Tashrif soni"];

    const csvRows = rows.map((r) => [
      r.code || "",
      r.first_name,
      r.last_name,
      r.phone,
      r.gender === "male" ? "Erkak" : "Ayol",
      r.date_of_birth,
      r.status === "active" ? "Faol" : "Nofaol",
      r.last_visit_date || "",
      String(r.visit_count),
    ]);

    const csvContent = [header, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bemorlar_${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderPatientRow = (item: PatientSearchItem) => {
    const age = new Date().getFullYear() - Number(item.date_of_birth.slice(0, 4));
    const gender = item.gender === "male" ? "Erkak" : item.gender === "female" ? "Ayol" : "";
    const avatarColor = getAvatarColor(item.id);
    const badge = getStatusBadge(item);
    const isNew = isNewThisMonth(item.created_at);

    return (
      <div
        key={item.id}
        className="px-5 hover:shadow-md transition-all duration-150 py-4 mb-3 border border-[#E0E6EB] flex md:flex-row flex-col md:items-center items-start justify-between gap-3 rounded-[10px] bg-[#fff]"
      >
        <Link to={`${item.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="md:w-[46px] md:h-[46px] w-[36px] h-[36px] shrink-0 flex justify-center items-center rounded-full md:text-[15px] text-[12px] font-[700]"
            style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
          >
            {getInitials(item.first_name, item.last_name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="md:text-[15px] text-[13px] font-[600] truncate">
                {item.first_name} {item.last_name}
              </h3>
              {isNew && (
                <span className="text-[10px] font-[600] px-1.5 py-0.5 rounded-full bg-[#EAF1FF] text-[#2D6FE0]">
                  Yangi
                </span>
              )}
            </div>
            <p className="md:text-[12px] text-[10px] text-[#8b8b8b]">
              {item.code || "—"} • {gender}
              {gender ? "," : ""} {age} yosh
            </p>
          </div>
        </Link>

        <div className="md:flex hidden items-center gap-1.5 text-[13px] text-[#44525C] min-w-[150px]">
          <BsTelephone className="text-[13px] text-[#8F99A3]" />
          {item.phone}
        </div>

        <div className="md:flex hidden flex-col min-w-[150px]">
          <span className="text-[11px] text-[#8F99A3]">Shifokor</span>
          <span className="text-[13px] text-[#44525C] truncate">
            {item.last_visit_doctor || "Tayinlanmagan"}
          </span>
        </div>

        <div className="md:flex hidden flex-col min-w-[150px]">
          <span className="text-[11px] text-[#8F99A3]">So'nggi tashrif</span>
          <span className="text-[13px] text-[#44525C]">
            {item.last_visit_date || "Hali tashrif yo'q"}
          </span>
        </div>

        <div className="md:flex hidden flex-col min-w-[70px]">
          <span className="text-[11px] text-[#8F99A3]">Tashrif</span>
          <span className="text-[13px] font-[600] text-[#44525C]">{item.visit_count} ta</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[12px] font-[500]"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: badge.dot }} />
            {badge.label}
          </span>

          <button
            onClick={() => navigate(`${item.id}`)}
            className="px-3 py-1.5 rounded-[8px] text-[12px] font-[500] text-white bg-[#0D9488] hover:bg-[#0C8377] transition-colors cursor-pointer"
          >
            Qabul
          </button>

          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "view",
                  label: "Ko'rish",
                  icon: <FiEye />,
                  onClick: () => navigate(`${item.id}`),
                },
              ],
            }}
          >
            <button
              onClick={(e) => e.preventDefault()}
              className="w-[32px] h-[32px] flex items-center justify-center rounded-[8px] text-[#8F99A3] hover:bg-[#F1F5F4] cursor-pointer"
            >
              <BsThreeDotsVertical />
            </button>
          </Dropdown>
        </div>
      </div>
    );
  };

  return (
    <div className="pr-[10px] md:pr-auto">
      {/* Page header */}
      <div className="flex md:flex-row flex-col md:items-center items-start justify-between gap-3 mt-4 mb-4">
        <div>
          <h1 className="text-[22px] font-[700]">Bemorlar</h1>
          <p className="text-[13px] text-[#8F99A3]">
            Klinikadagi barcha bemorlar ro'yxati va ularning holati
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#E0E6EB] text-[13px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            <FiDownload /> Eksport
          </button>
          <button
            onClick={() => alert("Excel import tez orada qo'shiladi")}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#E0E6EB] text-[13px] font-[500] text-[#44525C] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            <FiUpload /> Import (Excel)
          </button>
          <button
            onClick={() => navigate("/registration")}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] bg-[#0D9488] hover:bg-[#0C8377] transition-colors text-white text-[13px] font-[500] cursor-pointer"
          >
            <FiPlus /> Yangi bemor
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid md:grid-cols-4 grid-cols-2 gap-3 mb-4">
        <DashboardCard
          title="Jami bemorlar"
          icon={<LuUsers />}
          iconBg="bg-[#E7F0FA]"
          iconColor="text-[#2A81D8]"
          value={String(stats?.total ?? "—")}
          subtitle="Barcha bemorlar"
        />
        <DashboardCard
          title="Faol bemorlar"
          icon={<LuActivity />}
          iconBg="bg-[#E9FBF4]"
          iconColor="text-[#0D9488]"
          value={String(stats?.active ?? "—")}
          subtitle="Hozirda faol"
        />
        <DashboardCard
          title="Nofaol bemorlar"
          icon={<LuUserX />}
          iconBg="bg-[#F1F3F4]"
          iconColor="text-[#64727B]"
          value={String(stats?.inactive ?? "—")}
          subtitle="Faol emas"
        />
        <DashboardCard
          title="Shu oy yangi"
          icon={<LuUserPlus />}
          iconBg="bg-[#EAF1FF]"
          iconColor="text-[#2D6FE0]"
          value={String(stats?.new_this_month ?? "—")}
          subtitle="Ushbu oyda qo'shilgan"
        />
      </div>

      {/* Search + filters */}
      <div className="px-6 py-5 border border-[#E0E6EB] rounded-[10px] flex flex-col gap-3 mb-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <Form className="md:flex-1 !w-full">
            <Form.Item name="search" className="!m-0 relative flex-1">
              <AutoComplete
                options={options}
                onSelect={handleSelect}
                onSearch={handleSearch}
                className="!w-full"
                notFoundContent="Bemor topilmadi!"
              >
                <Input
                  prefix={<LuSearch className="text-[#A9B2B8] mr-1" />}
                  placeholder="Ism, telefon yoki ID bo'yicha qidiring..."
                  className="!w-full !h-[40px]"
                />
              </AutoComplete>
            </Form.Item>
          </Form>

          <div className="flex items-center gap-2 justify-between md:justify-end w-full md:w-auto">
            {["", "active", "nonactive"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setStatus(r);
                  setSelectedPatient(null);
                  setPage(1);
                }}
                className={`px-3 py-2 border border-[#eaeaea] rounded-[6px] ${
                  status === r ? "bg-[#2D80FF] text-white" : "text-black"
                } cursor-pointer text-[14px] md:h-[41px] hover:shadow-md transition-all duration-150`}
              >
                {r === "" ? "Barchasi" : r === "active" ? "Faol" : "Nofaol"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          <Select
            value={doctorId}
            onChange={(v) => {
              setDoctorId(v);
              setPage(1);
            }}
            options={doctorOptions}
            placeholder="Barcha shifokorlar"
            allowClear
            className="!w-full md:!w-[220px] !h-[40px]"
          />

          <DatePicker
            picker="month"
            value={month}
            onChange={(v) => {
              setMonth(v);
              setPage(1);
            }}
            placeholder="Oy bo'yicha"
            className="!w-full md:!w-[180px] !h-[40px]"
          />
        </div>
      </div>

      {/* Patients info */}
      <div className="mt-[14px] relative">
        {isLoading && (
          <div className="absolute left-0 top-0 z-[50] w-full h-[200px] flex justify-center items-center bg-white/40">
            <Spin indicator={<LoadingOutlined spin />} size="large" />
          </div>
        )}

        {selectedPatient ? (
          renderPatientRow(selectedPatient)
        ) : data?.data.length && data?.data.length > 0 ? (
          data?.data.map(renderPatientRow)
        ) : (
          !isLoading && <Empty />
        )}

        {/* Pagination */}
        {data?.meta?.total_items
          ? !selectedPatient &&
            data?.meta?.total_items > per_page && (
              <div className="px-6 py-4 border border-[#E0E6EB] flex items-center justify-end rounded-[10px] bg-[#fff] mb-5">
                <Pagination
                  current={page}
                  pageSize={per_page}
                  onChange={(p) => setPage(p)}
                  total={data.meta.total_items}
                />
              </div>
            )
          : ""}
      </div>
    </div>
  );
}
