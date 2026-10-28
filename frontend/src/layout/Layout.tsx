import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useCreateContext } from "../context/ContextApi";
import NavBar from "../components/NavBar";
import { useEffect } from "react";

export default function Layout() {
  const { collapsed } = useCreateContext();
  // console.log(collapsed);

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
        {/* <Container className="mx-auto flex"> */}
        <div className="z-10 md:block fixed top-3 left-3 bottom-3">
          <Sidebar />
        </div>
        <div
          className={`${
            collapsed ? "md:ms-[112px] ms-[92px]" : "ms-[332px]"
          } transition-all duration-150 ms-[0px] w-full lg:max-w-[2260px] md:max-w-[1300px] md:me-[20px]   flex-1`}
        >
          {/* Navabar */}
          <NavBar />
          <Outlet />
        </div>
        {/* </Container> */}
      </div>
    </div>
  );
}
