import { useLocation, useNavigate } from "react-router-dom";
import { Menu } from "antd";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { FiLogOut } from "react-icons/fi";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { useCreateContext } from "../context/ContextApi";
import logo from "../../public/images/logo.svg";
import logoText from "../../public/images/logo-text.svg";

type MenuItem = Required<Parameters<typeof Menu>[0]>["items"][number];

export default function SidebarSuperAdmin() {
  const { collapsed, setCollapsed } = useCreateContext();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname.split("/")[2] || "clinics";

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const items: MenuItem[] = [
    {
      key: "clinics",
      icon: <HiOutlineBuildingOffice2 />,
      label: "Klinikalar",
    },
  ];

  const handleEvent = (e: { key: string }) => {
    navigate(`/superadmin/${e.key}`, { replace: true });
  };

  return (
    <div
      className={`min-h-screen ${
        collapsed ? "w-[80px]" : "w-[300px]"
      }  flex flex-col`}
    >
      {/* Logo */}
      <div className="">
        <Menu
          onClick={() => navigate("/")}
          inlineCollapsed={collapsed}
          mode="inline"
          items={[
            {
              key: "logo",
              icon: (
                <div>
                  <img loading="lazy" src={logo} alt="" className="w-[35px]" />
                </div>
              ),
              label: (
                <img loading="lazy" src={logoText} alt="One Med" className="h-[24px]" />
              ),
            },
          ]}
          className="logo !border-none"
        />
      </div>

      {/* Asosiy menu */}
      <Menu
        onClick={handleEvent}
        selectedKeys={[currentPath]}
        mode="inline"
        inlineCollapsed={collapsed}
        items={items}
        className="!border-none flex-1 !pt-4"
      />

      {/* Logout */}
      <Menu
        onClick={() => navigate("/")}
        mode="inline"
        inlineCollapsed={collapsed}
        items={[{ key: "logout", icon: <FiLogOut />, label: "Chiqish" }]}
        className="!border-none"
      />

      {/* Collapse button */}
      <div className="!mt-auto !mb-0">
        <Menu
          onClick={toggleCollapsed}
          inlineCollapsed={collapsed}
          mode="inline"
          items={[
            {
              key: "toggle",
              icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />,
              label: "Sidebar",
            },
          ]}
          className="!border-none !pb-4 sidebarBtn"
        />
      </div>
    </div>
  );
}
