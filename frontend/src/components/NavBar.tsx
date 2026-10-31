import { FiPlus, FiBell, FiChevronDown, FiUser, FiSettings, FiLogOut } from "react-icons/fi";
import { Dropdown } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useCreateContext } from "../context/ContextApi";
import { useEffect, useState } from "react";
import SecureStorage from "react-secure-storage";

const weekDays = [
  "Yakshanba",
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
];

const monthNames = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  registrator: "Registrator",
  doctor: "Shifokor",
};

function getGreeting(hour: number) {
  if (hour < 6) return "Xayrli tun";
  if (hour < 12) return "Xayrli tong";
  if (hour < 17) return "Xayrli kun";
  return "Xayrli kech";
}

function getInitials(fio: string) {
  return fio
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getUserProfileData } = useCreateContext();

  const [fio, setFio] = useState("");

  useEffect(() => {
    const FIO =
      getUserProfileData?.data?.fio !== ""
        ? getUserProfileData?.data?.fio
        : localStorage.getItem("fio");
    if (FIO) {
      setFio(FIO);
    }
  }, [getUserProfileData]);

  const currentPath = location.pathname.split("/")[1] || "dashboard";

  const now = new Date();
  const dateLabel = `${weekDays[now.getDay()]}, ${now.getDate()}-${
    monthNames[now.getMonth()]
  }`;
  const firstName = fio.trim().split(/\s+/)[0] || "";

  const role =
    currentPath === "doctor"
      ? "Shifokor"
      : currentPath === "register"
      ? "Registrator"
      : getUserProfileData?.data?.role
      ? roleLabels[getUserProfileData.data.role] || "Administrator"
      : "Administrator";

  const handleLogout = () => {
    SecureStorage.removeItem("accessToken");
    SecureStorage.removeItem("refreshToken");
    SecureStorage.removeItem("userSettingData");
    SecureStorage.removeItem("role");
    localStorage.removeItem("fio");
    navigate("/", { replace: true });
  };

  return (
    <div className="flex items-center justify-between w-full py-3 border-b border-[#ECEFF1] bg-white/70 backdrop-blur-sm pr-[10px] md:pr-auto gap-4">
      <div className="shrink-0">
        <p className="text-[12px] text-[#8F99A3]">{dateLabel}</p>
        <h2 className="md:text-[18px] text-[14px] font-[600]">
          {getGreeting(now.getHours())}{firstName ? `, ${firstName}` : ""} 👋
        </h2>
      </div>

      <div className="flex-1 hidden md:flex justify-center max-w-[420px] mx-auto">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Bemor, shifokor yoki qabulni qidiring..."
            className="w-full h-[40px] rounded-[10px] border border-[#E0E6EB] bg-[#F9FAFB] pl-4 pr-14 text-[13px] outline-none focus:border-[#0D9488] transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#A9B2B8] border border-[#E0E6EB] rounded-[4px] px-1.5 py-0.5">
            Ctrl K
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button className="relative w-[38px] h-[38px] rounded-full border border-[#ECEFF1] hidden md:flex items-center justify-center text-[#44525C] hover:bg-[#F1F5F4] cursor-pointer">
          <FiBell />
        </button>

        <button
          onClick={() => navigate("/registration")}
          className="hidden sm:flex items-center gap-1.5 bg-[#0F2A2A] hover:bg-[#0D9488] transition-colors text-white text-[13px] font-[500] px-4 py-2.5 rounded-[10px] cursor-pointer"
        >
          <FiPlus /> Yangi qabul
        </button>

        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              {
                key: "profile",
                label: "Mening profilim",
                icon: <FiUser />,
                onClick: () => navigate("/settings"),
              },
              {
                key: "settings",
                label: "Sozlamalar",
                icon: <FiSettings />,
                onClick: () => navigate("/settings"),
              },
              { type: "divider" },
              {
                key: "logout",
                label: "Chiqish",
                icon: <FiLogOut />,
                danger: true,
                onClick: handleLogout,
              },
            ],
          }}
        >
          <div className="flex items-center gap-2 pl-2 md:border-l border-[#ECEFF1] cursor-pointer select-none">
            <div className="w-[36px] h-[36px] rounded-full bg-[#0D9488] text-white flex items-center justify-center text-[13px] font-[600]">
              {getInitials(fio || "U F") || "U"}
            </div>
            <div className="hidden md:block">
              <p className="text-[13px] font-[600] leading-tight">{fio}</p>
              <p className="text-[11px] text-[#8F99A3]">{role}</p>
            </div>
            <FiChevronDown className="hidden md:block text-[#8F99A3]" />
          </div>
        </Dropdown>
      </div>
    </div>
  );
}
