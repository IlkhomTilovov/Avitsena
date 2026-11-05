import { FiEdit2, FiPlus } from "react-icons/fi";
import {
  Card,
  Form,
  Input,
  Modal,
  notification,
  Pagination,
  Select,
  Spin,
} from "antd";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { BsTelephone } from "react-icons/bs";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LuSearch } from "react-icons/lu";
import { useDebouncedValue } from "../utils/useDebouncedValue";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { AvitcenaAdmin } from "../queries/query";
import { LoadingOutlined } from "@ant-design/icons";
import "../App.css";

type ClinicResponseType = {
  id: string;
  name: string;
  phone: string;
  address: string;
  status: string;
};

type ClinicObjType = {
  name: string;
  phone: string;
  address: string;
  admin: {
    fio: string;
    username: string;
    phone: string;
    password: string;
  };
};

type ClinicUpdateType = {
  name: string;
  phone: string;
  address: string;
  status: string;
};

export default function Clinics() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClinic, setEditingClinic] =
    useState<ClinicResponseType | null>(null);
  const [page, setPage] = useState(1);
  const per_page = 10;

  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());

  // Tepadagi umumiy qidiruvdan klinika tanlanganda keladi
  useEffect(() => {
    const fromUrl = searchParams.get("search");

    if (fromUrl !== null) {
      setSearchInput(fromUrl);
      setPage(1);
    }
  }, [searchParams]);

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

  const { data: clinicsData, isLoading } = useQuery({
    queryKey: ["clinics", page, per_page, search],
    queryFn: () => AvitcenaAdmin.getClinics(page, per_page, search),
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  const queryClient = useQueryClient();
  const { mutate: addClinicMutate, isLoading: addClinicLoading } = useMutation<
    ClinicResponseType,
    Error,
    ClinicObjType
  >((obj) => AvitcenaAdmin.addClinic(obj), {
    onSuccess: () => {
      queryClient.invalidateQueries(["clinics"]);
      openNotificationWithIcon(
        "success",
        "Klinika qo'shildi.",
        "Yangi klinika va uning admini muvaffaqiyatli yaratildi!"
      );
      setIsModalOpen(false);
    },
    onError: (error) => {
      openNotificationWithIcon(
        "error",
        "Xatolik yuz berdi!",
        error?.message || "Qaytadan urunib ko'ring iltimos!"
      );
    },
  });

  const addClinicFunc = (value: ClinicObjType) => {
    addClinicMutate(value);
  };

  const { mutate: updateClinicMutate, isLoading: updateClinicLoading } =
    useMutation<
      ClinicResponseType,
      Error,
      { id: string; obj: ClinicUpdateType }
    >(({ id, obj }) => AvitcenaAdmin.updateClinic(id, obj), {
      onSuccess: () => {
        queryClient.invalidateQueries(["clinics"]);
        openNotificationWithIcon(
          "success",
          "Klinika yangilandi.",
          "Klinika ma'lumotlari muvaffaqiyatli saqlandi!"
        );
        setEditingClinic(null);
      },
      onError: (error) => {
        openNotificationWithIcon(
          "error",
          "Xatolik yuz berdi!",
          error?.message || "Qaytadan urunib ko'ring iltimos!"
        );
      },
    });

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
            Klinikalar boshqaruvi
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#8F99A3]">
            Tizimdagi barcha klinikalarni boshqarish
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex gap-2 text-[14px] md:text-[16px] items-center py-2 px-4 rounded-md text-white cursor-pointer bg-[#2B7FFF] hover:shadow-md transition-all duration-150"
        >
          <FiPlus className="md:text-[20px] text-[14px] hidden md:block" />
          Klinika qo'shish
        </button>
      </div>

      <Input
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          setPage(1);
        }}
        allowClear
        aria-label="Klinikalarni qidirish"
        prefix={<LuSearch className="text-[#A9B2B8] mr-1" />}
        placeholder="Klinika nomi bo'yicha qidiring..."
        className="md:!w-[320px] !h-[40px] !mt-[14px]"
      />

      <div className="mt-[14px]">
        {clinicsData?.data?.length === 0 && (
          <div className="px-6 py-10 border border-[#E0E6EB] rounded-[10px] bg-white text-center text-[#8F99A3]">
            {search ? `"${search}" bo'yicha klinika topilmadi` : "Hali klinika yo'q"}
          </div>
        )}

        {clinicsData?.data?.map((item: ClinicResponseType) => (
          <div
            key={item.id}
            className="px-6 py-4 border border-[#E0E6EB] flex items-center justify-between rounded-[10px] bg-[#fff] mb-3"
          >
            <div className="flex items-center gap-3">
              <div className="md:w-[50px] md:h-[50px] w-[35px] h-[35px] flex justify-center items-center rounded-full bg-[#E7F0FA] text-[#2A81D8] md:text-[24px] text-[20px]">
                <HiOutlineBuildingOffice2 />
              </div>
              <div>
                <h3 className="md:text-[18px] text-[14px] font-[600]">
                  {item.name}
                </h3>
                <p className="md:text-[14px] text-[12px] text-[#8b8b8b] flex gap-2">
                  <BsTelephone /> {item.phone || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-2.5 py-1 rounded-full text-[#5AA6F2] bg-[#EEF6FD] flex items-center text-[14px] gap-1.5">
                {item.status}
              </button>
              <button
                onClick={() => setEditingClinic(item)}
                aria-label={`${item.name} klinikasini tahrirlash`}
                title="Tahrirlash"
                className="w-[34px] h-[34px] rounded-full text-[#2A81D8] bg-[#E7F0FA] flex justify-center items-center cursor-pointer hover:shadow-md transition-all duration-150"
              >
                <FiEdit2 />
              </button>
            </div>
          </div>
        ))}

        {/* Pagination */}
        {clinicsData?.meta?.total_items > per_page && (
          <div className="px-6 py-4 border border-[#E0E6EB] flex items-center justify-end rounded-[10px] bg-[#fff] mb-5">
            <Pagination
              current={page}
              pageSize={per_page}
              onChange={(p) => setPage(p)}
              total={clinicsData?.meta.total_items}
            />
          </div>
        )}
      </div>

      {/* Tahrirlash modali */}
      <Modal
        title="Klinikani tahrirlash"
        open={!!editingClinic}
        onCancel={() => setEditingClinic(null)}
        footer={false}
      >
        {editingClinic && (
          <Card className="!border-none">
            <Form
              key={editingClinic.id}
              initialValues={{
                name: editingClinic.name,
                phone: editingClinic.phone,
                address: editingClinic.address,
                status: editingClinic.status,
              }}
              onFinish={(obj: ClinicUpdateType) =>
                updateClinicMutate({ id: editingClinic.id, obj })
              }
              layout="vertical"
            >
              <Form.Item
                name="name"
                label="Klinika nomi"
                rules={[
                  { required: true, message: "Klinika nomi kiritilishi kerak!" },
                ]}
              >
                <Input placeholder="Klinika nomi" />
              </Form.Item>
              <Form.Item
                name="phone"
                label="Klinika telefon raqami"
                rules={[
                  { max: 13, message: "Telefon raqam 13 belgidan oshmasin!" },
                ]}
              >
                <Input placeholder="+998901234567" />
              </Form.Item>
              <Form.Item name="address" label="Manzil">
                <Input placeholder="Klinika manzili" />
              </Form.Item>
              <Form.Item name="status" label="Holati">
                <Select
                  options={[
                    { value: "active", label: "Faol" },
                    { value: "inactive", label: "Nofaol" },
                  ]}
                />
              </Form.Item>

              <button
                type="submit"
                disabled={updateClinicLoading}
                className="w-full !rounded-[4px] !h-[39px] !bg-[#2B7FFF] !text-[#fff] flex justify-center items-center cursor-pointer mt-2 disabled:opacity-70"
              >
                {updateClinicLoading ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </Form>
          </Card>
        )}
      </Modal>

      {/* Modal */}
      <Modal
        title="Klinika qo'shish"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={false}
      >
        {addClinicLoading ? (
          <div className="w-full h-[400px] flex justify-center items-center">
            <Spin indicator={<LoadingOutlined spin />} size="large" />
          </div>
        ) : (
          <Card className="!border-none">
            <Form onFinish={addClinicFunc} layout="vertical">
              <Form.Item
                name="name"
                label="Klinika nomi"
                rules={[
                  { required: true, message: "Klinika nomi kiritilishi kerak!" },
                ]}
              >
                <Input placeholder="Masalan: Titan Renesans" />
              </Form.Item>
              <Form.Item name="phone" label="Klinika telefon raqami">
                <Input placeholder="+998901234567" />
              </Form.Item>
              <Form.Item name="address" label="Manzil">
                <Input placeholder="Klinika manzili" />
              </Form.Item>

              <div className="border-t border-[#E0E6EB] my-4 pt-3">
                <p className="font-[600] mb-2">Klinika admini</p>
              </div>

              <Form.Item
                name={["admin", "fio"]}
                label="Admin F.I.Sh."
                rules={[
                  { required: true, message: "F.I.Sh. kiritilishi kerak!" },
                ]}
              >
                <Input placeholder="Familiya Ism Sharif" />
              </Form.Item>
              <Form.Item
                name={["admin", "username"]}
                label="Username"
                rules={[
                  { required: true, message: "Username kiritilishi kerak!" },
                ]}
              >
                <Input placeholder="admin" />
              </Form.Item>
              <Form.Item
                name={["admin", "phone"]}
                label="Admin telefon raqami"
                rules={[
                  { required: true, message: "Telefon raqam kiritilishi kerak!" },
                ]}
              >
                <Input placeholder="+998901234567" />
              </Form.Item>
              <Form.Item
                name={["admin", "password"]}
                label="Parol"
                rules={[
                  { required: true, message: "Parol kiritilishi kerak!" },
                  { min: 8, message: "Parol kamida 8 belgidan iborat bo'lishi kerak!" },
                ]}
              >
                <Input.Password placeholder="Parol" />
              </Form.Item>

              <button
                type="submit"
                className="w-full !rounded-[4px] !h-[39px] !bg-[#2B7FFF] !text-[#fff] flex justify-center items-center cursor-pointer mt-2"
              >
                Yaratish
              </button>
            </Form>
          </Card>
        )}
      </Modal>
    </div>
  );
}
