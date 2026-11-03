import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useEffect, useRef, useState } from "react";
import { Modal, Input, notification, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { IoHomeOutline, IoSettingsOutline } from "react-icons/io5";
import { LuUsers, LuUserPlus, LuWallet } from "react-icons/lu";
import { TbReportMedical, TbCategoryPlus } from "react-icons/tb";
import { MdOutlineDateRange } from "react-icons/md";
import { FiLogOut, FiHeadphones, FiCheckCircle, FiClock } from "react-icons/fi";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCreateContext } from "../context/ContextApi";
import { AvitcenaAdmin, SupportMessageItem } from "../queries/query";
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
  const [notifApi, contextHolder] = notification.useNotification();
  const queryClient = useQueryClient();

  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const historyEndRef = useRef<HTMLDivElement>(null);

  const { data: allStatData } = useQuery({
    queryFn: () => AvitcenaAdmin.allStat(),
    queryKey: ["allStat"],
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const { data: supportHistoryData, isLoading: isSupportHistoryLoading } = useQuery({
    queryFn: () => AvitcenaAdmin.getSupportMessages(1, 50),
    queryKey: ["mySupportMessages"],
    enabled: isSupportModalOpen,
  });

  const supportHistory: SupportMessageItem[] = [
    ...(supportHistoryData?.data || []),
  ].reverse();

  useEffect(() => {
    if (isSupportModalOpen) {
      historyEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [isSupportModalOpen, supportHistory.length]);

  const sendSupportMutation = useMutation({
    mutationFn: AvitcenaAdmin.sendSupportMessage,
    onSuccess: () => {
      notifApi.success({ message: "Murojaatingiz yuborildi" });
      setSupportMessage("");
      queryClient.invalidateQueries(["mySupportMessages"]);
    },
    onError: () => {
      notifApi.error({
        message: "Xatolik",
        description: "Murojaatni yuborib bo'lmadi, qayta urinib ko'ring",
      });
    },
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
    { key: "moliya", path: "/moliya", icon: <LuWallet />, label: "Moliya" },
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
          <img loading="lazy" src={logo} alt="" className="w-[28px] shrink-0" />
          {!collapsed && (
            <img loading="lazy" src={logoText} alt="Avitcena" className="h-[18px]" />
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

      {/* Help card (hozircha yashirilgan) */}
      {false && !collapsed && (
        <div className="bg-[#0F2A2A] rounded-[12px] p-4 mb-3 text-white">
          <div className="w-[32px] h-[32px] rounded-full bg-white/10 flex items-center justify-center text-[#2DD4BF] mb-2">
            <FiHeadphones />
          </div>
          <p className="text-[13px] font-[600]">Yordam kerakmi?</p>
          <p className="text-[11px] text-white/60 mb-3">Texnik qo'llab-quvvatlash 24/7 ishlaydi</p>
          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="w-full bg-[#0D9488] hover:bg-[#0C8377] transition-colors text-white text-[12px] font-[500] py-2 rounded-[8px] cursor-pointer"
          >
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
          SecureStorage.removeItem("role");
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

      {contextHolder}
      <Modal
        title="Texnik yordamga murojaat"
        open={isSupportModalOpen}
        onCancel={() => setIsSupportModalOpen(false)}
        onOk={() => sendSupportMutation.mutate(supportMessage)}
        okText={sendSupportMutation.isLoading ? "Yuborilmoqda..." : "Yuborish"}
        okButtonProps={{
          disabled: !supportMessage.trim() || sendSupportMutation.isLoading,
          className: "!bg-[#0D9488] hover:!bg-[#0C8377]",
        }}
        cancelText="Bekor qilish"
      >
        <p className="text-[13px] text-[#8F99A3] mb-2">
          Muammoingiz yoki savolingizni yozing, texnik jamoamiz tez orada bog'lanadi.
        </p>

        {isSupportHistoryLoading ? (
          <div className="w-full py-6 flex justify-center">
            <Spin indicator={<LoadingOutlined spin />} />
          </div>
        ) : supportHistory.length > 0 ? (
          <div className="max-h-[260px] overflow-y-auto flex flex-col gap-2 mb-3 pr-1">
            {supportHistory.map((item) => (
              <div key={item.id} className="flex flex-col gap-1.5">
                <div className="bg-[#F1F5F4] rounded-[10px] px-3 py-2 max-w-[90%] self-start">
                  <p className="text-[13px] text-[#263238] whitespace-pre-wrap">
                    {item.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[#8F99A3]">
                      {dayjs(item.created_at).format("DD.MM.YYYY HH:mm")}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[10px] font-[600] ${
                        item.delivered ? "text-[#0D9488]" : "text-[#D48806]"
                      }`}
                    >
                      {item.delivered ? <FiCheckCircle /> : <FiClock />}
                      {item.delivered ? "Yuborildi" : "Kutilmoqda"}
                    </span>
                  </div>
                </div>

                {item.reply && (
                  <div className="bg-[#0D9488] rounded-[10px] px-3 py-2 max-w-[90%] self-end">
                    <p className="text-[13px] text-white whitespace-pre-wrap">
                      {item.reply}
                    </p>
                    <span className="text-[11px] text-white/70">
                      {item.replied_at &&
                        dayjs(item.replied_at).format("DD.MM.YYYY HH:mm")}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>
        ) : (
          <div className="mb-3 px-3 py-4 border border-dashed border-[#E0E6EB] rounded-[10px] text-center text-[12px] text-[#8F99A3]">
            Hozircha murojaatlar tarixi yo'q
          </div>
        )}

        <Input.TextArea
          value={supportMessage}
          onChange={(e) => setSupportMessage(e.target.value)}
          placeholder="Xabaringizni yozing..."
          rows={4}
        />
      </Modal>
    </div>
  );
}
