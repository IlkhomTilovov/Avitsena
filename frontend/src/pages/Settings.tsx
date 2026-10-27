import { FiPlus } from "react-icons/fi";
import { TbCategoryPlus } from "react-icons/tb";
import { CloseOutlined, LoadingOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Form,
  GetProp,
  Input,
  Modal,
  notification,
  Select,
  Spin,
  TreeSelect,
  TreeSelectProps,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  ChangePasswordPayload,
  ChangePasswordResponse,
  GetOneCategoryResponse,
  OneMedAdmin,
} from "../queries/query";
import { useEffect, useState } from "react";
import { BiSolidEditAlt } from "react-icons/bi";
import { IoCheckmarkDoneSharp } from "react-icons/io5";
import { IoTrashOutline } from "react-icons/io5";

type ServiceType = {
  id: string;
  name: string;
  price: number;
};

type DataCategoryType = {
  id: string;
  name: string;
  services: ServiceType[];
};

type CategoryResponse = {
  success: boolean;
  data: DataCategoryType;
};
type CategoryRequest = {
  name: string;
};

type Service = {
  id: string;
  name: string;
  price: number;
};

type CategoryData = {
  id: string;
  name: string;
  services: Service[];
};

type ServicesResponse = {
  success: boolean;
  data: CategoryData;
};

type ServiceRequest = {
  name: string;
  price: number;
};

type CreateCategoryServiceRequest = {
  category: string; // category id
  services: ServiceRequest[];
};

type DefaultOptionType = GetProp<TreeSelectProps, "treeData">[number];

export interface Category {
  id: string;
  name: string;
  services: Service[];
}

export interface Doctor {
  categories: Category;
  experience_year: number;
  patients_stats: string;
}

export interface UserProfile {
  id: string;
  access_token: string;
  refresh_token: string;
  fio: string;
  username: string;
  role: "admin" | "doctor" | "user"; // agar role fixed bo‘lsa union qildim
  phone: string;
  doctor: Doctor | null;
  status: string;
  more: string | null;
}

export interface UserProfileResponse {
  success: boolean;
  data: UserProfile;
}

export interface DoctorPayload {
  experience_year?: number;
  services?: string[]; // services Select dan keladigan value lar
}

export interface UpdateProfilePayload {
  fio?: string;
  username?: string;
  phone?: string;
  role?: string;
  more?: string;
  doctor?: DoctorPayload;
}

export default function Settings() {
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [checkAddCategoryName, setCheckCategoryName] =
    useState<DataCategoryType>();
  const [closeCat, setCloseCat] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [successIndex, setSuccessIndex] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [value, setValue] = useState<string | undefined>();
  const [treeData, setTreeData] = useState<Omit<DefaultOptionType, "label">[]>(
    []
  );
  const [deleteBool, setDeleteBool] = useState(false);

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

  const per_page = 14;

  const queryClient = useQueryClient();
  const { mutate: categoryNameMutate, isLoading: categoryNameLoading } =
    useMutation<CategoryResponse, Error, CategoryRequest>(
      (obj) => OneMedAdmin.addCategory(obj),
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries(["getCategorylist"]);
          form.setFieldsValue({
            items: [...(form.getFieldValue("items") || []), { list: [] }],
          });
          setCheckCategoryName(data.data);
          setDeleteBool(false);
        },
        onError: () => {
          openNotificationWithIcon(
            "error",
            "Xatolik yuz berdi!",
            "Bu kategoriya bazada bo'lishi mumkin iltimos qaytadan urinib ko'ring!"
          );
        },
      }
    );

  // console.log(checkAddCategoryName);

  const addCategoryName = (value: { name: string }) => {
    categoryNameMutate(value);
  };

  // Servislarni qo'shib kategoriyaga bog'lab qo'yish
  const { mutate: addServicesMutate, isLoading: addServicesLoading } =
    useMutation<ServicesResponse, Error, CreateCategoryServiceRequest>(
      (obj) => OneMedAdmin.addServices(obj),
      {
        onSuccess: () => {
          queryClient.invalidateQueries(["addServices"]);
          refetch();

          // 🔥 Qayta bosh holatga qaytarish

          if (value) {
            categoryForm.resetFields();
            getOneCategoryRefetch();
            window.location.reload();
          } else {
            setCheckCategoryName(undefined);
            form.resetFields();
            setCloseCat(true);
            openNotificationWithIcon(
              "success",
              "Muvaffaqiyatli",
              "Kategoriya qo'shish muvaffaqiyatli amalga oshirildi!"
            );
          }

          // ✅ Sahifani refresh qilish
          // window.location.reload();
        },
        onError: () => {
          openNotificationWithIcon(
            "error",
            "Xatolik yuz berdi!",
            "Iltimos qaytadan urinib ko'ring!"
          );
        },
      }
    );

  // Safe handler — Form'dan olingan values'ni to'g'rilaymiz va validate qilamiz
  const addCategoryWithServices = (values: any) => {
    // values.items - formdan keladi. Hamma holatni tekshirib olamiz.
    const items = values?.items;
    if (!items || items.length === 0) {
      console.warn("Hech qanday item topilmadi");
      return;
    }

    // Formda bir yoki bir nechta item bo'lsa, ularning ichidan servislarni yig'ish:
    // (siz form tuzilishingizga qarab moslang)
    const servicesRaw = items[0]?.list ?? [];

    // Agar service bo'lmasa, chiqamiz
    if (!servicesRaw || servicesRaw.length === 0) {
      console.warn("Hech qanday servis topilmadi");
      return;
    }

    // ensure category id exists
    if (!checkAddCategoryName?.id) {
      console.warn("Category tanlanmagan (checkAddCategoryName.id yo'q)");
      return;
    }

    // Map qilib to'g'ri tipga keltiramiz (price — number bo'lishi kerak)
    const servicesPayload: ServiceRequest[] = servicesRaw.map((s: any) => ({
      name: String(s.name ?? ""),
      price: Number(s.price ?? 0),
    }));

    // Optional: filter out invalid servislar
    const servicesFiltered = servicesPayload.filter(
      (s) => s.name.trim().length > 0 && !Number.isNaN(s.price)
    );

    if (servicesFiltered.length === 0) {
      console.warn("Yaroqsiz servis ma'lumotlari");
      return;
    }

    const payload: CreateCategoryServiceRequest = {
      category: checkAddCategoryName.id,
      services: servicesFiltered,
    };

    // Endi mutate chaqiramiz
    addServicesMutate(payload);
  };

  // Select uchun categoriyalarni olish

  // Categoriyalar Listini olib kelob olish
  const {
    data: getCategoryList,
    isLoading: getCatLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["getCategorylist", page, per_page],
    queryFn: () => OneMedAdmin.getCategorylist(page, per_page),
    keepPreviousData: true,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // Bitta kategoriya tanlanganda ushani malumotlarini olib kelish
  const {
    data: getOneCategory,
    isLoading: getOneCategoryLoading,
    refetch: getOneCategoryRefetch,
  } = useQuery<GetOneCategoryResponse>({
    queryKey: ["getCategory", value],
    queryFn: () => OneMedAdmin.getOneCategory(value as string),
    enabled: !!value,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (getOneCategory?.data) {
      // categoryni formga joylash
      setCheckCategoryName(getOneCategory.data);

      // servislarni formga kiritamiz
      form.setFieldsValue({
        items: [
          {
            list: getOneCategory.data.services.map((srv) => ({
              name: srv.name,
              price: srv.price,
            })),
          },
        ],
      });

      setCloseCat(true);
    }
  }, [getOneCategory, form]);

  // Servisni o'zini edit qilish backendga so'rov yuboradigan joyi
  const { mutate: editServiceMutate } = useMutation<
    { id: string; name: string; category: string; price: number },
    Error,
    {
      id: string;
      obj: { name: string; category: string; price: number };
      index: number;
    }
  >(({ id, obj }) => OneMedAdmin.editService(id, obj), {
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["getCategory"]);
      console.log("Edited:", data);

      setSuccessIndex(variables.index);
      setEditingIndex(null);

      setTimeout(() => {
        setSuccessIndex(null);
      }, 2500);
    },
  });

  // Servislarni delete qilish
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { mutate: deleteServiceMutate } = useMutation(
    (id: string) => OneMedAdmin.deleteService(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["getCategory"]);
        refetch();
        setDeletingId(null);
      },
      onError: () => {
        setDeletingId(null);
      },
    }
  );

  const handleDelete = (id: string) => {
    setDeletingId(id); // faqat shu servisini loading qilamiz
    deleteServiceMutate(id);
  };

  // bu servislarni edit qilish fncsiyasi
  const handleEditServise = (
    selectIndex: number,
    obj: { name: string; price: number }
  ) => {
    const serviceId = checkAddCategoryName?.services[selectIndex]?.id;
    const categoryId = checkAddCategoryName?.id;

    if (serviceId && categoryId) {
      const updateObj = {
        name: obj.name,
        category: categoryId,
        price: obj.price,
      };

      setEditingIndex(selectIndex); // faqat shu index loading bo‘lsin
      editServiceMutate({ id: serviceId, obj: updateObj, index: selectIndex });
    }
  };

  useEffect(() => {
    if (getCategoryList?.data) {
      const formatted = getCategoryList.data.flatMap(
        (cat: DataCategoryType) => {
          const parentNode = {
            id: cat.id,
            pId: 0,
            value: cat.id,
            key: cat.id,
            title: cat.name,
            selectable: true,
          };

          const serviceNodes = cat.services.map((srv) => ({
            id: srv.id,
            pId: cat.id,
            key: cat.id,
            value: srv.id,
            title: `${srv.name} - ${srv.price} so'm`,
            selectable: false,
          }));

          return [parentNode, ...serviceNodes];
        }
      );

      setTreeData((prev) => [...prev, ...formatted]);

      // ❗️ agar oxirgi page bo‘lsa, page oshmasligi uchun belgi qo‘yamiz
      if (getCategoryList.data.length < per_page) {
        setHasMore(false);
      }
    }
  }, [getCategoryList]);

  // scroll event
  const handlePopupScroll: TreeSelectProps["onPopupScroll"] = (e) => {
    const target = e.target as HTMLDivElement;

    if (
      hasMore && // faqat hali malumot qolgan bo‘lsa
      !isFetching && // hozir fetch bo‘lmayotgan bo‘lsa
      target.scrollTop + target.offsetHeight >= target.scrollHeight - 5
    ) {
      setPage((prev) => prev + 1);
    }
  };

  // const [editCatState, setEditCatState] = useState("");
  // const { mutate: editCategoryMutate, isLoading: editCategoryLoading } =
  //   useMutation<Category, Error, { id: string; obj: CategoryRequest }>(
  //     ({ id, obj }) => OneMedAdmin.editCategory(id, obj),
  //     {
  //       onSuccess: (data) => {
  //         queryClient.invalidateQueries(["getOneCategory"]);
  //         setEditCatState(data.id);
  //         setCheckCategoryName(data); // yangilangan category qaytadi
  //       },
  //     }
  //   );

  const onChangeSelect = (newValue: string) => {
    setValue(newValue);
  };

  const [isCategoryEditing, setIsCategoryEditing] = useState(false);
  const [isCategoryEditingChange, setIsCategoryEditingChange] = useState("");

  const { mutate: updateCategoryMutate, isLoading: updateCategoryLoading } =
    useMutation(
      (data: { id: string; name: string }) =>
        OneMedAdmin.updateCategory(data.id, { name: data.name }),
      {
        onSuccess: () => {
          queryClient.invalidateQueries(["getCategory"]);
          setIsCategoryEditing(false);
          refetch();
        },
        onError: (err) => {
          console.error("Update category error:", err);
        },
      }
    );

  const handleCategoryEdit = () => {
    form.setFieldsValue({
      categoryName: checkAddCategoryName?.name, // mavjud nomni inputga qo‘yish
    });
    setIsCategoryEditing(true);
  };

  const handleSaveCategory = () => {
    if (checkAddCategoryName?.id && isCategoryEditingChange) {
      updateCategoryMutate({
        id: checkAddCategoryName.id,
        name: isCategoryEditingChange,
      });
    }
  };
  const handleChangeValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCategoryEditingChange(e.target.value);
  };

  // console.log(checkAddCategoryName);

  // 🔥 mutation

  // const { mutate: deleteCategoryMutate, isLoading: deleteCategoryLoading } =
  //   useMutation((id: string) => OneMedAdmin.deleteCategory(id), {
  //     onSuccess: () => {
  //       queryClient.invalidateQueries(["getCategorylist"]);
  //       setCheckCategoryName(undefined);
  //       setValue("");
  //       setDeleteBool(true);
  //     },
  //     onError: (err) => {
  //       console.error("Delete category error:", err);
  //     },
  //   });

  // 🔥 click handler
  // const handleDeleteCategory = (id: string) => {
  //   deleteCategoryMutate(id);
  // };

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalPassOpen, setIsModalPassOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setIsEditing(false);
  };

  const showModalPass = () => {
    setIsModalPassOpen(true);
  };

  const handleOkPass = () => {
    setIsModalPassOpen(false);
  };

  const handleCancelPass = () => {
    setIsModalPassOpen(false);
  };

  // Queru orqali user profile malumotlarini olish
  const { data: getUserProfileData } = useQuery<UserProfileResponse>({
    queryKey: ["getUserProfile"], // category emas, user profile
    queryFn: () => OneMedAdmin.getUserProfile(),
    staleTime: Infinity,
    cacheTime: Infinity,
    enabled: !!isModalOpen,
  });

  useEffect(() => {
    if (getUserProfileData?.data) {
      form.setFieldsValue({
        fio: getUserProfileData.data.fio,
        username: getUserProfileData.data.username,
        phone: getUserProfileData.data.phone,
        role: getUserProfileData.data.role,
        more: getUserProfileData.data.more,
        doctor: getUserProfileData.data.doctor
          ? {
              experience_year: getUserProfileData.data.doctor.experience_year,
              patients_stats: getUserProfileData.data.doctor.patients_stats,
              categories: {
                name: getUserProfileData.data.doctor.categories?.name,
                services:
                  getUserProfileData.data.doctor.categories?.services?.map(
                    (s) => ({
                      name: s.name,
                      price: s.price,
                    })
                  ),
              },
            }
          : undefined,
      });
    }
  }, [getUserProfileData, form]);

  const { mutate: updateProfileMutate, isLoading: updateProfileDataLoading } =
    useMutation<UserProfileResponse, Error, UpdateProfilePayload>(
      (obj) => OneMedAdmin.updateProfileData(obj),
      {
        onSuccess: () => {
          queryClient.invalidateQueries(["updateProfileData"]);
          openNotificationWithIcon(
            "success",
            "Profil yangilandi",
            "Profil yangilanishi muvaffaqiyatli bo'ldi!"
          );
          handleCancel();
        },
        onError: (err) => {
          console.error("Update profile error:", err);
        },
      }
    );

  const { mutate: changePassword, isLoading: changingPassword } = useMutation<
    ChangePasswordResponse,
    unknown,
    ChangePasswordPayload
  >((payload) => OneMedAdmin.changePassword(payload), {
    onSuccess: () => {
      form.resetFields();
      openNotificationWithIcon(
        "success",
        "Parol yangilandi",
        "Parolni yodda saqladingiz degan umiddaman!"
      );
      setIsModalPassOpen(false);
    },
    onError: () => {
      openNotificationWithIcon(
        "error",
        "Xatolik yuz berdi!",
        "Parol yangilanmadi qaytadan urinib ko'ring!"
      );
    },
  });

  const handlePasswordSave = (values: any) => {
    changePassword({
      old_password: values.oldPassword,
      new_password: values.newPassword,
    });
  };

  const [newServices, setNewServices] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="pr-[10px] md:pr-auto">
      {contextHolder}
      <div className="flex items-center justify-between mt-[30px]">
        <div>
          <h1 className="md:text-[22px] text-[18px] font-[600]">
            Sozlamalar paneli
          </h1>
          <p className="text-[#8F99A3] text-[14px] md:text-[16px]">
            Profile sozlamalari va kategoriyalar boshqaruvi
          </p>
        </div>

        <div className="flex items-center gap-2 md:flex-row flex-col-reverse">
          <button
            onClick={showModalPass}
            className="cursor-pointer hover:shadow-md  text-yellow-500 border-yellow-500 md:px-6 px-3 md:py-2 py-1.5 border  rounded-md text-[14px] flex gap-2 hover:bg-[#ffbc1218] transition-all duration-150"
          >
            Parolni o'zgartirish
          </button>

          <button
            onClick={showModal}
            className="flex gap-2 items-center hover:shadow-md transition-all duration-150  md:px-6 px-3 md:py-2 py-1.5 rounded-md text-[14px] text-white cursor-pointer bg-[#2B7FFF]"
          >
            <FiPlus className="text-[20px]" />
            Accountni sozlash
          </button>
        </div>
      </div>

      <Modal
        title="Admin parolini o'zgartirish"
        closable={{ "aria-label": "Custom Close Button" }}
        open={isModalPassOpen}
        onOk={handleOkPass}
        onCancel={handleCancelPass}
        footer={false}
      >
        <Card className="!border-none">
          <Form layout="vertical" onFinish={handlePasswordSave}>
            <Form.Item
              name="oldPassword"
              label="Eski parolingizni kiriting"
              className="col-span-6"
              rules={[{ required: true, message: "Eski parolni kiriting!" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="Yangi parolni kiriting"
              className="col-span-6"
              rules={[{ required: true, message: "Yangi parolni kiriting!" }]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="reNewPassword"
              label="Parolni takrorlang"
              className="col-span-6"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Parolni takrorlang!" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("Parollar bir xil emas ❌")
                    );
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>

            <div className="flex justify-end">
              <Button
                type="primary"
                htmlType="submit"
                className="!h-[38px] !py-2.5 !w-full hover:shadow-md transition-all duration-150"
              >
                {changingPassword ? (
                  <Spin
                    className="!text-white"
                    indicator={<LoadingOutlined spin />}
                  />
                ) : (
                  "Saqlash"
                )}
              </Button>
            </div>
          </Form>
        </Card>
      </Modal>

      <Modal
        title="Admin profilini sozlash"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={false}
      >
        <Card className="!border-none">
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              const payload = {
                fio: values.fio,
                username: values.username,
                role: values.role,
                phone: values.phone,
                more: values.more,
                doctor: values.doctor
                  ? {
                      experience_year: values.doctor.experience_year,
                      services: values.doctor.services,
                    }
                  : undefined,
              };

              console.log("Yuboriladigan payload:", payload);
              updateProfileMutate(payload);
            }}
          >
            <Form.Item label="FIO" name="fio">
              <Input disabled={!isEditing} />
            </Form.Item>

            <Form.Item label="Username" name="username">
              <Input disabled={!isEditing} />
            </Form.Item>

            <Form.Item label="Phone" name="phone">
              <Input disabled={!isEditing} />
            </Form.Item>

            <Form.Item label="Role" name="role">
              <Input disabled={true} />
            </Form.Item>

            <Form.Item label="More" name="more">
              <Input disabled={!isEditing} />
            </Form.Item>

            {getUserProfileData?.data?.doctor && (
              <>
                <Form.Item
                  label="Experience Year"
                  name={["doctor", "experience_year"]}
                >
                  <Input type="number" disabled={!isEditing} />
                </Form.Item>

                <Form.Item label="Services" name={["doctor", "services"]}>
                  <Select
                    mode="multiple"
                    placeholder="Xizmatlarni tanlang"
                    disabled={!isEditing}
                    options={[
                      {
                        label: "Service 1",
                        value: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                      },
                      {
                        label: "Service 2",
                        value: "7fa85f64-5717-4562-b3fc-2c963f66afa6",
                      },
                    ]}
                  />
                </Form.Item>
              </>
            )}

            <div className="flex justify-end gap-2">
              {!isEditing ? (
                <div
                  onClick={() => setIsEditing(true)}
                  className="flex justify-center cursor-pointer items-center !w-full !h-[38px] mt-3 px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                >
                  Tahrirlash
                </div>
              ) : (
                <Button
                  type="primary"
                  htmlType="submit"
                  className="!h-[38px] !py-2.5 !w-full"
                >
                  {updateProfileDataLoading ? (
                    <Spin
                      className="!text-white"
                      indicator={<LoadingOutlined spin />}
                    />
                  ) : (
                    "Saqlash"
                  )}
                </Button>
              )}
            </div>
          </Form>
        </Card>
      </Modal>

      <div className="border md:w-full w-full border-[#e3e3e3] rounded-[10px] px-6 py-4 mb-3 mt-6">
        <div className="flex items-center gap-3">
          <TbCategoryPlus className="text-[20px] text-[#2B7FFF] mb-1" />
          <h2 className="md:text-[18px] text-[16px] font-[500]">
            Kategoriyalar qo'shish
          </h2>
        </div>
        <div>
          <div className="grid w-full grid-cols-12 mt-4 gap-4">
            <div className="md:!col-span-4 !col-span-12 border rounded-xl border-[#F0F0F0] px-4 py-2">
              <h3 className="font-[500] mb-3 text-[14px] mt-3">
                Mavjud Kategoriyalarni tanlash
              </h3>

              <div>
                <TreeSelect
                  treeDataSimpleMode
                  style={{ width: "100%" }}
                  value={value}
                  placeholder="Please select"
                  onChange={onChangeSelect}
                  treeData={treeData}
                  loading={getCatLoading && page === 1} // faqat birinchi page uchun umumiy spin
                  onPopupScroll={handlePopupScroll}
                  styles={{
                    popup: {
                      root: { maxHeight: 300, overflow: "auto" },
                    },
                  }}
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
              </div>
            </div>

            <div className="md:!col-span-8 !col-span-12  relative">
              {getOneCategoryLoading ? (
                <div className="absolute top-0 left-0 w-full flex justify-center items-center h-full z-[9999]">
                  <Spin indicator={<LoadingOutlined spin />} />
                </div>
              ) : checkAddCategoryName ? (
                ""
              ) : (
                <div className=" border rounded-xl border-[#F0F0F0] px-4 py-2">
                  <h3 className="font-[500] mb-3 text-[14px] mt-3">
                    Yangi kategoriya qo'shish
                  </h3>

                  <Form layout="vertical" onFinish={addCategoryName}>
                    <Form.Item name="name" label="Kategoriya nomi">
                      <Input />
                    </Form.Item>

                    <Form.Item>
                      <button className="!bg-[#4D94FF] hover:shadow-md transition-all duration-150 hover:!bg-[#2B7FFF] !h-[40px] !text-white cursor-pointer w-full rounded-md">
                        {categoryNameLoading ? (
                          <Spin
                            className="!text-white"
                            indicator={<LoadingOutlined spin />}
                          />
                        ) : (
                          "+ Yangi kategoriya qo'shish"
                        )}
                      </button>
                    </Form.Item>
                  </Form>
                </div>
              )}

              {value ? ( // update bogandagi form
                <div className="border rounded-xl border-[#F0F0F0] px-4 py-2">
                  <Form
                    form={form}
                    layout="inline"
                    onFinish={(values) => {
                      if (checkAddCategoryName?.id) {
                        updateCategoryMutate({
                          id: checkAddCategoryName.id,
                          name: values.categoryName,
                        });
                      }
                      console.log(values);
                    }}
                    style={{ marginBottom: "20px" }}
                    className="flex justify-between"
                  >
                    <Form.Item name="categoryName">
                      {!isCategoryEditing ? (
                        <div>
                          <h2 className=" font-[500]">
                            {checkAddCategoryName?.name}
                          </h2>
                        </div>
                      ) : (
                        <Input
                          placeholder="Kategoriya nomi"
                          disabled={!isCategoryEditing}
                          onChange={handleChangeValue}
                        />
                      )}
                    </Form.Item>

                    <div className="flex gap-3">
                      {isCategoryEditing ? (
                        <Button
                          type="primary"
                          htmlType="button"
                          onClick={handleSaveCategory}
                          loading={updateCategoryLoading}
                          className="hover:shadow-md transition-all duration-150"
                        >
                          Saqlash
                        </Button>
                      ) : (
                        <Button
                          onClick={handleCategoryEdit}
                          icon={<BiSolidEditAlt />}
                          className="hover:shadow-md transition-all duration-150"
                        >
                          Tahrirlash
                        </Button>
                      )}
                      {/* {deleteCategoryLoading ? (
                        <Spin indicator={<LoadingOutlined spin />} />
                      ) : (
                        <Button
                          danger
                          type="primary"
                          icon={<IoTrashOutline />}
                          onClick={() => {
                            if (checkAddCategoryName?.id) {
                              handleDeleteCategory(checkAddCategoryName.id);
                            }
                          }}
                        >
                          Kategoriyani o‘chirish
                        </Button>
                      )} */}
                    </div>
                  </Form>
                  <Form
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    form={form}
                    name="dynamic_form_complex"
                    autoComplete="off"
                    className="!w-full"
                  >
                    <Form.List name="items">
                      {(fields) => (
                        <div
                          style={{
                            display: "flex",
                            rowGap: 16,
                            flexDirection: "column",
                            width: "100%",
                          }}
                        >
                          {fields.map((field) => (
                            <Form.Item key={field.name} label="Servis">
                              <Form.List name={[field.name, "list"]}>
                                {(subFields) => (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      rowGap: 16,
                                    }}
                                  >
                                    {subFields.map((subField) => {
                                      const isEditing =
                                        editingIndex === subField.name;
                                      const isSuccess =
                                        successIndex === subField.name;

                                      return (
                                        <div
                                          className="!flex justify-between gap-5"
                                          key={subField.key}
                                        >
                                          <Form.Item
                                            noStyle
                                            name={[subField.name, "name"]}
                                          >
                                            <Input placeholder="Servis nomi" />
                                          </Form.Item>
                                          <Form.Item
                                            noStyle
                                            name={[subField.name, "price"]}
                                          >
                                            <Input
                                              type="number"
                                              placeholder="Servis narxi"
                                            />
                                          </Form.Item>

                                          {deletingId ===
                                          checkAddCategoryName?.services[
                                            subField.name
                                          ]?.id ? (
                                            <Spin
                                              indicator={
                                                <LoadingOutlined spin />
                                              }
                                            />
                                          ) : (
                                            <div className="cursor-pointer text-[24px] flex items-center justify-center h-[35px] text-[#bb203a] !w-[50px]">
                                              <IoTrashOutline
                                                onClick={() => {
                                                  const serviceId =
                                                    checkAddCategoryName
                                                      ?.services[subField.name]
                                                      ?.id;
                                                  if (serviceId) {
                                                    handleDelete(serviceId);
                                                  }
                                                }}
                                              />
                                            </div>
                                          )}

                                          {isEditing ? (
                                            <Spin
                                              indicator={
                                                <LoadingOutlined spin />
                                              }
                                            />
                                          ) : isSuccess ? (
                                            <div className="text-[25px] flex items-center justify-center h-[35px] text-[#006a31] !w-[50px]">
                                              <IoCheckmarkDoneSharp />
                                            </div>
                                          ) : (
                                            <div
                                              onClick={() => {
                                                const allItems =
                                                  form.getFieldValue("items");
                                                const currentService =
                                                  allItems?.[field.name]
                                                    ?.list?.[subField.name];
                                                if (currentService) {
                                                  handleEditServise(
                                                    subField.name,
                                                    {
                                                      name: currentService.name,
                                                      price:
                                                        currentService.price,
                                                    }
                                                  );
                                                }
                                              }}
                                              className="text-[25px] flex items-center justify-center h-[35px] cursor-pointer text-[#2B7FFF] !w-[50px]"
                                            >
                                              <IoCheckmarkDoneSharp />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}

                                    {/* <Button
                                        onClick={() => subOpt.add()}
                                        block
                                      >
                                        + Servis qo'shish
                                      </Button> */}
                                  </div>
                                )}
                              </Form.List>
                            </Form.Item>
                          ))}
                        </div>
                      )}
                    </Form.List>
                  </Form>

                  <Form
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    name="new_services_form"
                    autoComplete="off"
                    form={categoryForm}
                    className="!w-full"
                    onFinish={(values) => {
                      console.log("Yangi servislar:", values);

                      addServicesMutate({
                        category: checkAddCategoryName?.id!,
                        services: values.newServices, // alohida field
                      });
                    }}
                  >
                    <Form.List name="newServices">
                      {(fields, { add, remove }) => (
                        <div
                          style={{
                            display: "flex",
                            rowGap: 16,
                            flexDirection: "column",
                            width: "100%",
                          }}
                        >
                          {fields.map((field) => (
                            <Form.Item label="Servis">
                              <div className="!flex justify-between gap-5">
                                <Form.Item noStyle name={[field.name, "name"]}>
                                  <Input placeholder="Servis nomi" />
                                </Form.Item>
                                <Form.Item noStyle name={[field.name, "price"]}>
                                  <Input
                                    type="number"
                                    placeholder="Servis narxi"
                                  />
                                </Form.Item>
                                <CloseOutlined
                                  onClick={() => remove(field.name)}
                                />
                              </div>
                            </Form.Item>
                          ))}

                          <Button
                            onClick={() => {
                              add();
                              setNewServices(true);
                            }}
                            className="hover:shadow-md transition-all duration-150"
                            block
                          >
                            + Servis qo‘shish
                          </Button>

                          {newServices && (
                            <Button
                              className="!bg-[#4D94FF] hover:!bg-[#2B7FFF] !h-[40px] !text-white hover:shadow-md transition-all duration-150"
                              htmlType="submit"
                              block
                            >
                              {addServicesLoading ? (
                                <Spin
                                  className="!text-[#fff]"
                                  indicator={<LoadingOutlined spin />}
                                />
                              ) : (
                                "+"
                              )}{" "}
                              Yangi servislarni yuborish
                            </Button>
                          )}
                        </div>
                      )}
                    </Form.List>
                  </Form>
                </div>
              ) : (
                checkAddCategoryName &&
                !value &&
                !deleteBool && (
                  <div className="border rounded-xl border-[#F0F0F0] px-4 py-2">
                    <Form
                      labelCol={{ span: 6 }}
                      wrapperCol={{ span: 18 }}
                      form={form}
                      name="dynamic_form_complex"
                      autoComplete="off"
                      className="!w-full"
                      onFinish={(value) => addCategoryWithServices(value)}
                    >
                      <Form.List name="items">
                        {(fields, { add, remove }) => (
                          <div
                            style={{
                              display: "flex",
                              rowGap: 16,
                              flexDirection: "column",
                              width: "100%",
                            }}
                          >
                            {fields.map((field) => (
                              <Card
                                size="small"
                                title={
                                  checkAddCategoryName?.name ||
                                  "Yangi kategoriya"
                                }
                                key={field.key}
                                extra={
                                  <CloseOutlined
                                    onClick={() => {
                                      remove(field.name);
                                      setCloseCat(false);
                                    }}
                                  />
                                }
                              >
                                <Form.Item label="Servis">
                                  <Form.List name={[field.name, "list"]}>
                                    {(subFields, subOpt) => (
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          rowGap: 16,
                                        }}
                                      >
                                        {subFields.map((subField) => (
                                          <div
                                            className="!flex justify-between gap-5"
                                            key={subField.key}
                                          >
                                            <Form.Item
                                              noStyle
                                              name={[subField.name, "name"]}
                                            >
                                              <Input placeholder="Servis nomi" />
                                            </Form.Item>
                                            <Form.Item
                                              noStyle
                                              name={[subField.name, "price"]}
                                            >
                                              <Input
                                                type="number"
                                                placeholder="Servis narxi"
                                              />
                                            </Form.Item>
                                            <CloseOutlined
                                              onClick={() =>
                                                subOpt.remove(subField.name)
                                              }
                                            />
                                          </div>
                                        ))}

                                        <Button
                                          onClick={() => subOpt.add()}
                                          block
                                          className="hover:shadow-md transition-all duration-150"
                                        >
                                          + Servis qo'shish
                                        </Button>
                                      </div>
                                    )}
                                  </Form.List>
                                </Form.Item>
                              </Card>
                            ))}

                            {checkAddCategoryName && closeCat ? (
                              <Button
                                className="!bg-[#4D94FF] hover:!bg-[#2B7FFF] !h-[40px] !text-white hover:shadow-md transition-all duration-150"
                                htmlType="submit"
                                block
                              >
                                {addServicesLoading ? (
                                  <Spin
                                    className="!text-white"
                                    indicator={<LoadingOutlined spin />}
                                  />
                                ) : (
                                  "+ Ma'lumotlarni yuborish"
                                )}
                              </Button>
                            ) : !closeCat ? (
                              <Button
                                className="!bg-[#4D94FF] hover:!bg-[#2B7FFF] !h-[40px] !text-white hover:shadow-md transition-all duration-150"
                                htmlType="button"
                                block
                                onClick={() => {
                                  setCloseCat(true);
                                  add();
                                }}
                              >
                                + Kategoriyaga servis qo'shsih
                              </Button>
                            ) : (
                              ""
                            )}
                          </div>
                        )}
                      </Form.List>
                    </Form>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
