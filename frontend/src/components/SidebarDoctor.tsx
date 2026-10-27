import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { FiLogOut } from "react-icons/fi";
import type { MenuProps } from "antd";
import { Menu } from "antd";
import { useCreateContext } from "../context/ContextApi";
import { useLocation, useNavigate } from "react-router-dom";
import { IoSettingsOutline } from "react-icons/io5";
import { PiUserListBold } from "react-icons/pi";
import logo from "../../public/images/logo.svg";
import logoText from "../../public/images/logo-text.svg";
import "../App.css";

type MenuItem = Required<MenuProps>["items"][number];

export default function SidebarDoctor() {
  const { collapsed, setCollapsed } = useCreateContext();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const items: MenuItem[] = [
    { key: "patients", icon: <PiUserListBold />, label: "Bemorlar ro'yhati" },
    { key: "settings", icon: <IoSettingsOutline />, label: "Sozlamalar " },
  ];

  const handleEvent = (e: { key: string }) => {
    navigate(e.key, { replace: true });
  };

  const handleEventLogOut = (e: { key: string }) => {
    navigate(e.key, { replace: true });
  };

  const currentPath = location.pathname.split("/")[2] || "patients";
  return (
    <div
      className={`min-h-screen ${
        collapsed ? "w-[80px]" : "w-[300px]"
      }  flex flex-col `}
    >
      <div className="">
        <Menu
          onClick={handleEvent}
          inlineCollapsed={collapsed}
          mode="inline"
          items={[
            {
              key: "/",
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
      <Menu
        onClick={handleEvent}
        defaultSelectedKeys={[currentPath]}
        mode="inline"
        inlineCollapsed={collapsed}
        items={items}
        className="!border-none flex-1 !pt-4"
      />
      <Menu
        onClick={handleEventLogOut}
        mode="inline"
        inlineCollapsed={collapsed}
        items={[{ key: "/", icon: <FiLogOut />, label: "Chiqish" }]}
        className="!border-none"
      />
      <div className="!mt-auto">
        <Menu
          onClick={toggleCollapsed}
          inlineCollapsed={collapsed}
          mode="inline"
          items={[
            {
              key: "1",
              icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />,
              label: "Sidebar",
            },
          ]}
          className=" !border-none !pb-4 sidebarBtn"
        />
      </div>
    </div>
  );
}
