import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { IoHomeOutline, IoSettingsOutline } from "react-icons/io5";
import { LuUsers, LuUserPlus } from "react-icons/lu";
import { TbReportMedical, TbCategoryPlus } from "react-icons/tb";
import { MdOutlineDateRange } from "react-icons/md";
import { FiLogOut, FiHeadphones } from "react-icons/fi";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { useCreateContext } from "../context/ContextApi";
import { OneMedAdmin } from "../queries/query";
import SecureStorage from "react-secure-storage";
import logo from "../../public/images/logo.svg";
import logoText from "../../public/images/logo-text.svg";

type NavItem = {
  key: string;
  path: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
};

export default function Sidebar() {
  const { collapsed, setCollapsed } = useCreateContext();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: allStatData } = useQuery({
    queryFn: () => OneMedAdmin.allStat(),
    queryKey: ["allStat"],
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const currentPath = "/" + (location.pathname.split("/")[1] || "dashboard");

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const menuItems: NavItem[] = [
    { key: "dashboard", path: "/dashboard", icon: <IoHomeOutline />, label: "Bosh sahifa" },
    {
      key: "patients",
      path: "/patients",
      icon: <LuUsers />,
      label: "Bemorlar",
      badge: allStatData?.data?.patients_stats?.total_patients,
    },
    { key: "registration", path: "/registration", icon: <LuUserPlus />, label: "Ro'yxatdan o'tish" },
    {
      key: "receptions",
      path: "/receptions",
      icon: <MdOutlineDateRange />,
      label: "Qabullar",
      badge: allStatData?.data?.visits_stats?.pending_visits,
    },
    { key: "employees", path: "/employees", icon: <TbReportMedical />, label: "Xodimlar" },
  ];

  const systemItems: NavItem[] = [
    { key: "services", path: "/services", icon: <TbCategoryPlus />, label: "Xizmatlar" },
    { key: "settings", path: "/settings", icon: <IoSettingsOutline />, label: "Sozlamalar" },
  ];

  const renderItem = (item: NavItem) => {
    const active = currentPath === item.path;

    return (
      <button
        key={item.key}
        onClick={() => navigate(item.path, { replace: true })}
        title={collapsed ? item.label : undefined}
        className={`w-full flex items-center ${
          collapsed ? "justify-center" : "justify-between"
        } gap-2 px-3 py-2.5 rounded-[10px] mb-1 cursor-pointer transition-all duration-150 ${
          active
            ? "bg-[#0D9488] text-white shadow-sm"
            : "text-[#44525C] hover:bg-[#F1F5F4]"
        }`}
      >
        <span className="flex items-center gap-3">
          <span className="text-[18px]">{item.icon}</span>
          {!collapsed && <span className="text-[14px] font-[500]">{item.label}</span>}
        </span>
        {!collapsed && !!item.badge && (
          <span
            className={`text-[11px] font-[600] px-2 py-0.5 rounded-full ${
              active ? "bg-white/25 text-white" : "bg-[#E9FBF4] text-[#0D9488]"
            }`}
          >
            {item.badge.toLocaleString()}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className={`h-full ${
        collapsed ? "w-[80px]" : "w-[280px]"
      } flex flex-col bg-white border border-[#ECEFF1] rounded-[20px] shadow-sm px-3 py-4 overflow-y-auto`}
    >
      {/* Logo */}
      <div
        className={`flex items-center ${
          collapsed ? "flex-col gap-2 justify-center" : "justify-between gap-3"
        } px-2 pb-5 mb-2 border-b border-[#F0F2F3]`}
      >
        <div className="flex items-center gap-3">
          <img loading="lazy" src={logo} alt="" className="w-[35px] shrink-0" />
          {!collapsed && (
            <img loading="lazy" src={logoText} alt="One Med" className="h-[24px]" />
          )}
        </div>

        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Kengaytirish" : "Yig'ish"}
          className="w-[28px] h-[28px] shrink-0 flex items-center justify-center text-[#8F99A3] hover:bg-[#F1F5F4] rounded-[8px] cursor-pointer"
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>
      </div>

      {/* Menu */}
      {!collapsed && (
        <p className="text-[11px] font-[600] text-[#A9B2B8] px-3 mb-2 tracking-wide">MENYU</p>
      )}
      <div className="mb-4">{menuItems.map(renderItem)}</div>

      {!collapsed && (
        <p className="text-[11px] font-[600] text-[#A9B2B8] px-3 mb-2 tracking-wide">BOSHQARUV</p>
      )}
      <div className="flex-1">{systemItems.map(renderItem)}</div>

      {/* Help card */}
      {!collapsed && (
        <div className="bg-[#0F2A2A] rounded-[12px] p-4 mb-3 text-white">
          <div className="w-[32px] h-[32px] rounded-full bg-white/10 flex items-center justify-center text-[#2DD4BF] mb-2">
            <FiHeadphones />
          </div>
          <p className="text-[13px] font-[600]">Yordam kerakmi?</p>
          <p className="text-[11px] text-white/60 mb-3">Texnik qo'llab-quvvatlash 24/7 ishlaydi</p>
          <button className="w-full bg-[#0D9488] hover:bg-[#0C8377] transition-colors text-white text-[12px] font-[500] py-2 rounded-[8px] cursor-pointer">
            Murojaat qilish
          </button>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={() => {
          SecureStorage.removeItem("accessToken");
          SecureStorage.removeItem("refreshToken");
          SecureStorage.removeItem("userSettingData");
          localStorage.removeItem("fio");
          navigate("/", { replace: true });
        }}
        className={`w-full flex items-center ${
          collapsed ? "justify-center" : ""
        } gap-3 px-3 py-2.5 text-[#44525C] hover:bg-[#F1F5F4] rounded-[10px] cursor-pointer`}
      >
        <FiLogOut />
        {!collapsed && <span className="text-[14px] font-[500]">Chiqish</span>}
      </button>
    </div>
  );
}
