import { useEffect } from "react";
import { useCreateContext } from "../context/ContextApi";
import NavBar from "../components/NavBar";
import { Outlet } from "react-router-dom";
import SidebarSuperAdmin from "../components/SidebarSuperAdmin";

export default function SuperAdminLayout() {
  const { collapsed } = useCreateContext();

  useEffect(() => {
    const handlePopState = () => {
      window.history.go(1);
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
  return (
    <div className="">
      <div className="lg:max-w-[2560px] md:max-w-[1600px]  mx-auto flex bg-[#F9FAFB]">
        <div className="z-10 h-screen md:block fixed  ">
          <SidebarSuperAdmin />
        </div>
        <div
          className={`${
            collapsed ? "md:ms-[100px] ms-[80px]" : "ms-[320px]"
          } transition-all duration-150 ms-[0px] w-full lg:max-w-[2260px] md:max-w-[1300px] md:me-[20px]   flex-1`}
        >
          <NavBar />
          <Outlet />
        </div>
      </div>
    </div>
  );
}
