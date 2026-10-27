import { FiPlus } from "react-icons/fi";
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
};
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
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeResponseType | null>(null);

  useEffect(() => {
    setSearchText("");
  }, []);

  // Xodimlar olish
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["employees", page, per_page, searchText, role],
    queryFn: () =>
      OneMedAdmin.getEmployeesFilter(page, per_page, searchText, role),
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
      <div className="flex items-center justify-between mt-[30px]">
        <div>
          <h1 className="md:text-[22px] text-[18px] font-[600]">
            Xodimlar boshqaruvi
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#8F99A3]">
            Klinika xodimlari va ularning jadvallarini boshqarish
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex gap-2 text-[14px] md:text-[16px] items-center py-2 px-4 rounded-md text-white cursor-pointer bg-[#2B7FFF] hover:shadow-md transition-all duration-150"
        >
          <FiPlus className="md:text-[20px] text-[14px] hidden md:block" />
          Xodim qo'shish
        </button>
      </div>

      {/* Search + filter */}
      <div className="px-6 py-6 border border-[#E0E6EB] rounded-[10px] flex md:flex-row flex-col items-center gap-3 mt-4">
        <Form className="md:flex-1 !w-full">
          <Form.Item name="search" className="!m-0 relative flex-1">
            <AutoComplete
              options={options}
              onSelect={handleSelect}
              onSearch={handleSearch}
              placeholder="Xodim qidiring..."
              className="!w-full !h-[40px]"
              notFoundContent="Xodim topilmadi!"
            />
          </Form.Item>
        </Form>
        <div className="flex items-center gap-2">
          {["", "admin", "doctor", "registrator"].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-3 py-2 border border-[#eaeaea] rounded-[6px] ${
                role === r ? "bg-[#2D80FF] text-white " : "text-black"
              } cursor-pointer text-[14px] md:h-[41px] hover:shadow-md transition-all duration-150`}
            >
              {r === ""
                ? "Barchasi"
                : r === "doctor"
                ? "Shifokorlar"
                : r === "registrator"
                ? "Xodimlar"
                : "Adminlar"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-[14px]">
        {selectedEmployee ? (
          // faqat tanlangan bitta xodimni chiqarish
          <Link
            key={selectedEmployee.id}
            to={`${selectedEmployee.id}`}
            className="px-6 py-4 border border-[#E0E6EB] flex items-center justify-between rounded-[10px] bg-[#fff] mb-3 hover:shadow-md transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="md:w-[50px] md:h-[50px] w-[35px] h-[35px] flex justify-center items-center rounded-full bg-[#E7F0FA] text-[#2A81D8] md:text-[24px] text-[20px]">
                <LuUser />
              </div>
              <div>
                <h3 className="md:text-[18px] text-[14px] font-[600]">
                  {selectedEmployee.fio}
                </h3>
                <p className="md:text-[14px] text-[12px] text-[#8b8b8b] flex gap-2">
                  <BsTelephone /> {selectedEmployee.phone}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-2.5 py-1 rounded-full text-[#5AA6F2] bg-[#EEF6FD] flex items-center text-[14px] gap-1.5">
                <FaUserDoctor /> {selectedEmployee.role}
              </button>
            </div>
          </Link>
        ) : (
          employeesData?.data?.map((item: any) => (
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
                  <FaUserDoctor /> {item.role}
                </button>
              </div>
            </Link>
          ))
        )}

        {/* Pagination */}
        {employeesData?.meta?.total_items > 10 && !selectedEmployee && (
          <div className="px-6 py-4 border border-[#E0E6EB] flex items-center justify-end rounded-[10px] bg-[#fff] mb-5">
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
