import { MdOutlinePersonAddAlt } from "react-icons/md";
import {
  AutoComplete,
  DatePicker,
  Form,
  Input,
  notification,
  Select,
  Spin,
  TreeSelect,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { OneMedAdmin } from "../queries/query";
import { LoadingOutlined } from "@ant-design/icons";
import { useState } from "react";

import "../App.css";

// ------- Types ---------
type pasport = {
  series: string;
  number: string;
  jshr: string;
  issued_by: string;
  issued_date: Dayjs;
  expiry_date: Dayjs;
};
type driver = {
  number: string;
  jshr: string;
};
type sendResponseValuesType = {
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  document_type: string;
  pasport?: pasport;
  idcard?: pasport;
  driver_license?: driver;
  gender: string;
  date_of_birth: Dayjs;
  blood_group: string;
  country: string;
  height: number;
  weight: number;
};
// Servis modeli
type Service = {
  id: string;
  name: string;
  price: number;
};

export type PatientOption = {
  key: string;
  value: string;
  label: React.ReactNode;
};
type Document = {
  series: string;
  number: string;
  jshr: string;
  issued_by: string;
  issued_date: string;
  expiry_date: string;
};

type DriverLicense = {
  number: string;
  jshr: string;
};

export type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  phone: string;
  home_phone: string | null;
  gender: "male" | "female";
  blood_group: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  date_of_birth: string; // backend string qaytaradi
  country: string;
  region: string;
  address: string;
  height: number;
  weight: number;
  status: string;
  document_type: "pasport" | "idcard" | "driver_license";
  pasport: Document | null;
  idcard: Document | null;
  driver_license: DriverLicense | null;
  created_at: string;
  updated_at: string;
};
export type PatientSelectResponse = {
  success: boolean;
  data: Patient; // bunda date_of_birth, pasport.issued_date ham string edi
};

export type PatientResponse = {
  success: boolean;
  message: string;
  data: Patient;
};
export type PatientRequest = Omit<
  sendResponseValuesType,
  "date_of_birth" | "pasport" | "idcard"
> & {
  date_of_birth: string;
  pasport?: Omit<Document, "issued_date" | "expiry_date"> & {
    issued_date: string;
    expiry_date: string;
  };
  idcard?: Omit<Document, "issued_date" | "expiry_date"> & {
    issued_date: string;
    expiry_date: string;
  };
  driver_license?: DriverLicense;
};

export type Category = {
  id: string;
  name: string;
  services: Service[];
};
// ------- Component ---------
export default function Registration() {
  const [form] = Form.useForm();
  const [docType, setDocType] = useState("");
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  // natification

  type NotificationType = "success" | "info" | "warning" | "error";

  const [api, contextHolder] = notification.useNotification();

  const openNotificationWithIcon = (
    type: NotificationType,
    message: string
  ) => {
    api[type]({
      message: "Notification Title",
      description: message,
    });
  };

  // Shifokor tanlaganda ID ni ushlab turadigan state
  const [handleSelectDoctorState, setHandleSelectDoctorState] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const obj = {
    doctor: handleSelectDoctorState,
    services: selectedServices,
  };

  // yangi tashrif
  const { mutate: addNewVisitMutate, isLoading: newVisitLoading } = useMutation<
    any,
    Error,
    string
  >(
    (id) =>
      OneMedAdmin.addNewVisit(id, {
        doctor: handleSelectDoctorState,
        services: selectedServices,
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["patient", obj]);
        setHandleSelectDoctorState("");
        form.resetFields();
        setSelectedPatientId(null);
        setSelectedServices([]);
        setIsFormDisabled(false);
        openNotificationWithIcon("success", "Bemorga doctor biriktirildi");
      },
      onError: (error) => {
        console.log(error);
      },
    }
  );

  // Yangi bemor qo‘shish
  const { mutate: addPatientMutate, isLoading: addPatientLoading } =
    useMutation<PatientResponse, Error, PatientRequest>(
      (obj) => OneMedAdmin.addPatient(obj),
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          // showMessage("Yangi bemor muvaffaqqiyatli qo'shildi!");
          // ✅ Forma tozalash

          form.resetFields();
          setSelectedPatientId(null); // ✅ yangi ID saqlaymiz
          setIsFormDisabled(false); // yangi bemorda forma tahrirlanadi
          openNotificationWithIcon("success", "Yangi bemor qo‘shildi");
        },
        onError: (err) => {
          openNotificationWithIcon("error", err.message);
          // showMessage("Yangi bemor muvaffaqqiyatli qo'shildi!");
          // error("Xatolik yuz berdi!");
        },
      }
    );

  // Eski bemorni yangilash
  const { mutate: updatePatientMutate, isLoading: updatePatientLoading } =
    useMutation<PatientResponse, Error, { id: string; obj: PatientRequest }>(
      ({ id, obj }) => OneMedAdmin.updatePatient(id, obj),
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          form.resetFields();
          setIsFormDisabled(false);
          setSelectedPatientId(null);
          openNotificationWithIcon("success", "Bemor yangilandi");
          // success("Bemor muvaffaqqiyatli yangilandi!");
        },
        onError: () => {
          // error("Xatolik yuz berdi!");
        },
      }
    );

  // Submit qilganda POST/PUT aniqlash
  const handleSendPatientValues = (value: sendResponseValuesType) => {
    const object: PatientRequest = {
      ...value,
      date_of_birth: value.date_of_birth?.format("YYYY-MM-DD"),
      pasport: value.pasport
        ? {
            ...value.pasport,
            issued_date: value.pasport.issued_date?.format("YYYY-MM-DD"),
            expiry_date: value.pasport.expiry_date?.format("YYYY-MM-DD"),
          }
        : undefined,
      idcard: value.idcard
        ? {
            ...value.idcard,
            issued_date: value.idcard.issued_date?.format("YYYY-MM-DD"),
            expiry_date: value.idcard.expiry_date?.format("YYYY-MM-DD"),
          }
        : undefined,
    };

    if (selectedPatientId) {
      // Agar ID bor → update
      updatePatientMutate({ id: selectedPatientId, obj: object });
    } else {
      // Agar ID yo‘q → yangi create
      addPatientMutate(object);
    }
  };

  // Search
  const [options, setOptions] = useState<PatientOption[]>([]);
  const [value, setValue] = useState("");
  const { mutate: searchMutate } = useMutation<any, Error, string>(
    (search) => OneMedAdmin.searchPatient(search),
    {
      onSuccess: (data) => {
        const mapped = data.data.map((item: any) => ({
          key: item.id,
          value: item.first_name + " " + item.last_name,
          label: (
            <div key={item.id}>
              {item.first_name} {item.last_name}
            </div>
          ),
        }));
        setOptions(mapped);
      },
    }
  );

  const handleSearch = (text: string) => {
    setValue(text);
    if (text.trim() !== "") {
      searchMutate(text);
    } else {
      setOptions([]);
    }
  };

  // Select qilganda eski bemorni olish
  const { mutate: selectMutate } = useMutation<
    PatientSelectResponse,
    Error,
    string
  >((id: string) => OneMedAdmin.selectPatient(id), {
    onSuccess: (data) => {
      // setSelectedPatientId(data.data.id);
      setDocType(data.data.document_type);
      form.setFieldsValue({
        first_name: data.data.first_name,
        last_name: data.data.last_name,
        middle_name: data.data.middle_name,
        phone: data.data.phone,
        gender: data.data.gender,
        blood_group: data.data.blood_group,
        document_type: data.data.document_type,
        country: data.data.country,
        region: data.data.region,
        address: data.data.address,
        height: data.data.height,
        weight: data.data.weight,
        date_of_birth: data.data.date_of_birth
          ? dayjs(data.data.date_of_birth)
          : null,
        pasport: data.data.pasport
          ? {
              series: data.data.pasport.series,
              number: data.data.pasport.number,
              jshr: data.data.pasport.jshr,
              issued_by: data.data.pasport.issued_by,
              issued_date: data.data.pasport.issued_date
                ? dayjs(data.data.pasport.issued_date)
                : null,
              expiry_date: data.data.pasport.expiry_date
                ? dayjs(data.data.pasport.expiry_date)
                : null,
            }
          : undefined,
        idcard: data.data.idcard
          ? {
              series: data.data.idcard.series,
              number: data.data.idcard.number,
              jshr: data.data.idcard.jshr,
              issued_by: data.data.idcard.issued_by,
              issued_date: data.data.idcard.issued_date
                ? dayjs(data.data.idcard.issued_date)
                : null,
              expiry_date: data.data.idcard.expiry_date
                ? dayjs(data.data.idcard.expiry_date)
                : null,
            }
          : undefined,
        driver_license: data.data.driver_license
          ? {
              number: data.data.driver_license.number,
              jshr: data.data.driver_license.jshr,
            }
          : undefined,
      });
    },
    onError: () => {
      // setSelectedPatientId(null);
      form.resetFields();
    },
  });

  const handleSelect = (val: string, option: any) => {
    setSelectedPatientId(option.key);
    setIsFormDisabled(true); // ✅ eski bemor bo‘lsa forma disable
    selectMutate(option.key);
    console.log(val);
  };

  const handleDoctorSubmit = () => {
    if (!selectedPatientId) {
      console.error("Avval bemorni qo'shing!");
      return;
    }

    addNewVisitMutate(selectedPatientId);
  };

  const handleDocType = (value: string) => {
    setDocType(value);
  };

  // Shifokor tanlaganda ID ni ushlab turadigan state

  // 3. Xodimlar (shifokorlar) ro‘yxati
  const { data: employeesData } = useQuery({
    queryKey: ["employees", 1, 20, "", "doctor"],
    queryFn: () => OneMedAdmin.getEmployeesFilter(1, 20, "", "doctor"),
    keepPreviousData: true,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // 4. Doktordan xizmatlar olish
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["services", handleSelectDoctorState],
    queryFn: () => OneMedAdmin.getServicesFromDoctor(handleSelectDoctorState),
    enabled: !!handleSelectDoctorState,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // Select uchun shifokor options
  const employeeOptions =
    employeesData?.data?.map((item: any) => ({
      value: item.id,
      label: item.fio,
    })) || [];

  // TreeSelect uchun service daraxti

  const treeData2 = categories
    ? categories.map((category: Category) => ({
        value: category.id,
        title: category.name,
        selectable: false,
        children: category.services.map((srv: Service) => ({
          value: srv.id,
          title: srv.name,
        })),
      }))
    : [];

  // if (addPatientLoading || updatePatientLoading) {
  //   return (
  //     <div className="absolute left-0 top-0 z-[9999] w-full h-screen flex justify-center items-center bg-white/20 backdrop:blur-2xl">
  //       <Spin indicator={<LoadingOutlined spin />} size="large" />
  //     </div>
  //   );
  // }

  return (
    <div className="w-full flex justify-center py-2 flex-col pr-[10px] md:pr-auto ">
      {contextHolder}
      {/* Search */}
      <div className="border md:w-full w-full border-[#e3e3e3] rounded-[10px] px-6 py-4 mb-3 register">
        <Form form={form} className="flex items-center">
          <Form.Item name="search" className="!m-0 relative flex-1">
            <AutoComplete
              value={value}
              options={options}
              onSelect={handleSelect}
              onSearch={handleSearch}
              onChange={(data) => setValue(data)}
              placeholder="Bemor qidiring..."
              className="!w-full !h-[40px]"
              notFoundContent="Bemor topilmadi!"
            />
          </Form.Item>
          <button className="px-[30px] bg-[#2B7FFF] !h-[40px] rounded-l-[0px] rounded-md text-white font-[500] cursor-pointer">
            Izlash
          </button>
        </Form>
      </div>

      {/* Forma */}
      <Form
        form={form}
        onFinish={handleSendPatientValues}
        layout="vertical"
        className="border md:w-full w-full border-[#e3e3e3] rounded-[20px]"
        disabled={isFormDisabled} // ✅ shu joyda disable
      >
        <div className="flex items-center md:text-[22px] text-[18px] font-[600] gap-2 bg-[#F4FCF9] rounded-t-[20px] px-[24px] py-[10px]">
          <MdOutlinePersonAddAlt className="text-[#2B7FFF] md:text-[25px] text-[20px] mt-[1px]" />
          <h2>
            {selectedPatientId
              ? "Bemor ma’lumotlarini yangilash"
              : "Bemorni ro'yxatga olish"}
          </h2>
        </div>
        <div className="px-[24px] py-4">
          <h3 className="md:text-[18px] text-[14px] text-red-500 font-[500]">
            Majburiy ma'lumotlar
          </h3>
          <div className="grid grid-cols-6 gap-3">
            <Form.Item
              name="first_name"
              label="Ism"
              rules={[{ required: true, message: "Ismni kiriting" }]}
              className="md:col-span-2 col-span-6"
            >
              <Input className="w-full !h-[40px]" />
            </Form.Item>
            <Form.Item
              name="last_name"
              label="Familiya"
              rules={[{ required: true, message: "Familyani kiriting" }]}
              className="md:col-span-2 col-span-6"
            >
              <Input className="w-full  !h-[40px]" />
            </Form.Item>
            <Form.Item
              name="date_of_birth"
              label="Tug'ilgan sana"
              rules={[{ required: true, message: "Tug'ilgan sanani kiriting" }]}
              className="md:col-span-2 col-span-6"
            >
              <DatePicker className="w-full !h-[40px]" />
            </Form.Item>
          </div>
        </div>

        <div className="px-[24px] pb-4">
          <h3 className="md:text-[18px] text-[14px] text-red-500 font-[500]">
            Muhim ma'lumotlar
          </h3>
          <div className="grid grid-cols-6 gap-3">
            <Form.Item
              name="middle_name"
              label="Otasining ismi"
              className="md:col-span-2 col-span-6"
            >
              <Input className="w-full !h-[40px]" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Telefon raqam"
              className="md:col-span-2 col-span-6"
            >
              <Input placeholder="+998991234567" className="w-full !h-[40px]" />
            </Form.Item>

            <Form.Item
              name="blood_group"
              label="Qon guruhi"
              className="md:col-span-2 col-span-6"
            >
              <Select
                className="w-full  !h-[40px]"
                options={[
                  { value: "A+", label: "A+" },
                  { value: "A-", label: "A-" },
                  {
                    value: "B+",
                    label: "B+",
                  },
                  {
                    value: "B-",
                    label: "B-",
                  },
                  {
                    value: "AB+",
                    label: "AB+",
                  },
                  {
                    value: "AB-",
                    label: "AB-",
                  },
                  {
                    value: "O+",
                    label: "O-",
                  },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="gender"
              label="Jinsi"
              className="remove-required md:col-span-2 col-span-6"
              rules={[{ required: true, message: "Jinsini kiriting" }]}
            >
              <Select
                className="w-full  !h-[40px]"
                options={[
                  { value: "male", label: "Erkak" },
                  { value: "female", label: "Ayol" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="document_type"
              label="Document turi"
              className="md:col-span-2 col-span-6"
            >
              <Select
                className="w-full  !h-[40px]"
                onChange={handleDocType}
                options={[
                  { value: "pasport", label: "Pasport" },
                  { value: "idcard", label: "IdCard" },
                  {
                    value: "driver_license",
                    label: "Haydovchilik guvohnomasi",
                  },
                ]}
              />
            </Form.Item>
          </div>

          {/* pasport  */}
          {docType === "pasport" ? (
            <div>
              <h4 className="md:text-[16px] text-[14px] font-[500] mb-2">
                Pasport
              </h4>
              <div className="grid grid-cols-7 gap-3">
                <Form.Item
                  name={["pasport", "series"]}
                  className="md:col-span-1 col-span-7"
                >
                  <Input placeholder="Seriasi" className="w-full !h-[40px]" />
                </Form.Item>
                <Form.Item
                  name={["pasport", "number"]}
                  className="md:col-span-3 col-span-7"
                >
                  <Input placeholder="Raqami" className="w-full !h-[40px]" />
                </Form.Item>
                <Form.Item
                  name={["pasport", "jshr"]}
                  className="md:col-span-3 col-span-7"
                >
                  <Input
                    placeholder="JSHR raqami"
                    className="w-full !h-[40px]"
                  />
                </Form.Item>
              </div>
              <div className="grid grid-cols-6 gap-3">
                <Form.Item
                  name={["pasport", "issued_by"]}
                  className="md:col-span-2 col-span-6"
                >
                  <Input
                    placeholder="Kim tomonidan berilgan"
                    className="w-full !h-[40px]"
                  />
                </Form.Item>
                <Form.Item
                  name={["pasport", "issued_date"]}
                  className="md:col-span-2 col-span-6"
                >
                  <DatePicker className="w-full !h-[40px]" />
                </Form.Item>
                <Form.Item
                  name={["pasport", "expiry_date"]}
                  className="md:col-span-2 col-span-6"
                >
                  <DatePicker className="w-full !h-[40px]" />
                </Form.Item>
              </div>
            </div>
          ) : docType === "idcard" ? (
            <div>
              <h4 className="md:text-[16px] text-[14px] font-[500] mb-2">
                Id Carta
              </h4>
              <div className="grid grid-cols-7 gap-3">
                <Form.Item
                  name={["idcard", "series"]}
                  className="md:col-span-1 col-span-7"
                >
                  <Input placeholder="Seriasi" className="w-full !h-[40px]" />
                </Form.Item>
                <Form.Item
                  name={["idcard", "number"]}
                  className="md:col-span-3 col-span-7"
                >
                  <Input placeholder="Raqami" className="w-full !h-[40px]" />
                </Form.Item>
                <Form.Item
                  name={["idcard", "jshr"]}
                  className="md:col-span-3 col-span-7"
                >
                  <Input
                    placeholder="JSHR raqami"
                    className="w-full !h-[40px]"
                  />
                </Form.Item>
              </div>
              <div className="grid grid-cols-6 gap-3">
                <Form.Item
                  name={["idcard", "issued_by"]}
                  className="md:col-span-2 col-span-6"
                >
                  <Input
                    placeholder="Kim tomonidan berilgan"
                    className="w-full !h-[40px]"
                  />
                </Form.Item>
                <Form.Item
                  name={["idcard", "issued_date"]}
                  className="md:col-span-2 col-span-6"
                >
                  <DatePicker className="w-full !h-[40px]" />
                </Form.Item>
                <Form.Item
                  name={["idcard", "expiry_date"]}
                  className="md:col-span-2 col-span-6"
                >
                  <DatePicker className="w-full !h-[40px]" />
                </Form.Item>
              </div>
            </div>
          ) : docType === "driver_license" ? (
            <div>
              <h4 className="md:text-[16px] text-[14px] font-[500] mb-2">
                Haydovchilik guvohnomasi
              </h4>
              <div className="grid grid-cols-6 gap-3">
                <Form.Item
                  name={["driver_license", "number"]}
                  className="md:col-span-3 col-span-6"
                >
                  <Input
                    placeholder="Card number"
                    className="w-full  !h-[40px]"
                  />
                </Form.Item>
                <Form.Item
                  name={["driver_license", "jshr"]}
                  className="md:col-span-3 col-span-6"
                >
                  <Input
                    placeholder="Card JSHR"
                    className="w-full  !h-[40px]"
                  />
                </Form.Item>
              </div>
            </div>
          ) : (
            ""
          )}
        </div>

        <div className="px-[24px] pb-4">
          <h3 className="md:text-[18px] text-[14px] font-[600]">
            Qo'shimcha ma'lumotlar
          </h3>
          <div className="grid grid-cols-6 gap-3">
            <Form.Item
              name="country"
              label="Davlati"
              className="md:col-span-2 col-span-6"
            >
              <Select
                className="w-full  !h-[40px]"
                options={[{ value: "uz", label: "Uzbekistan" }]}
              />
            </Form.Item>
            <Form.Item
              name="region"
              label="Shahar"
              className="md:col-span-2 col-span-6"
            >
              <Input className="w-full  !h-[40px]" />
            </Form.Item>
            <Form.Item
              name="address"
              label="Tuman, qishloq"
              className="md:col-span-2 col-span-6"
            >
              <Input className="w-full  !h-[40px]" />
            </Form.Item>

            <Form.Item
              name="height"
              label="Bo'yi"
              className="md:col-span-2 col-span-6"
            >
              <Input className="w-full  !h-[40px]" />
            </Form.Item>
            <Form.Item
              name="weight"
              label="Og'irligi"
              className="md:col-span-2 col-span-6"
            >
              <Input className="w-full  !h-[40px]" />
            </Form.Item>
          </div>
          <div className="md:px-[24px] pb-4 flex gap-4 justify-end">
            <button
              onClick={() => form.resetFields()}
              className="md:px-[30px] bg-[#d7d7d753] hover:shadow-md transition-all duration-150 py-2.5 text-[12px] md:text-[16px] rounded-md text-black font-[500] cursor-pointer"
              type="button"
            >
              Formani tozalash
            </button>
            {selectedPatientId && (
              <button
                onClick={() => {
                  form.resetFields(),
                    setSelectedPatientId(null),
                    setIsFormDisabled(false);
                }}
                className="md:px-[30px] hover:shadow-md transition-all duration-150  bg-[#d7d7d753] py-2.5 text-[12px] md:text-[16px] rounded-md text-black font-[500] cursor-pointer  flex justify-center items-center"
                type="button"
              >
                Yangi bemor qo'shish
              </button>
            )}
            {isFormDisabled ? (
              <div
                onClick={() => setIsFormDisabled(false)}
                className="md:px-[30px] hover:shadow-md transition-all duration-150  bg-[#2B7FFF] rounded-md text-[12px] md:text-[16px] text-white font-[500] cursor-pointer !w-[150px] flex justify-center items-center"
              >
                O'zgartirish
              </div>
            ) : (
              <button
                type="submit"
                className="md:px-[30px] hover:shadow-md transition-all duration-150 bg-[#2B7FFF] text-[12px] md:text-[16px] rounded-md text-white font-[500] cursor-pointer !w-[150px] flex justify-center items-center"
              >
                {selectedPatientId ? (
                  addPatientLoading || updatePatientLoading ? (
                    <Spin
                      indicator={<LoadingOutlined spin />}
                      className="!text-white"
                    />
                  ) : (
                    "Yangilash"
                  )
                ) : (
                  "Qo'shsih"
                )}
              </button>
            )}
          </div>
        </div>
      </Form>
      {/* Servise qo'shsih */}

      {selectedPatientId ? (
        <div className=" border md:w-full w-full border-[#e3e3e3] rounded-[20px] px-[24px] py-[10px] mt-4 mb-5">
          <h3 className="md:text-[18px] text-[14px] font-[600] mt-4">
            Bemorni shifokorga biriktirish
          </h3>
          <div className="grid grid-cols-6 gap-3 mt-2">
            <div className="flex flex-col gap-1 md:col-span-2 col-span-6">
              <label className="text-sm">Shifokor</label>
              <Select
                className="w-full !h-[40px]"
                onChange={(val) => setHandleSelectDoctorState(val)}
                options={employeeOptions}
                // value={selectedDoctor}
              />
            </div>

            {handleSelectDoctorState && (
              <div className="flex flex-col gap-1 md:col-span-2 col-span-6">
                <label className="text-sm ">Servislar</label>
                <TreeSelect
                  showSearch
                  style={{ width: "100%" }}
                  className="!min-h-[40px]"
                  multiple
                  placeholder="Please select"
                  allowClear
                  treeCheckable
                  treeDefaultExpandAll
                  showCheckedStrategy={TreeSelect.SHOW_CHILD}
                  treeData={treeData2}
                  value={selectedServices}
                  onChange={(val) => setSelectedServices(val)}
                />
              </div>
            )}
          </div>
          <div className="px-[24px] pb-4 flex gap-4 justify-end mt-3 md:mt-auto">
            <button
              onClick={handleDoctorSubmit}
              className="px-[30px] hover:shadow-md transition-all duration-150 !h-[42px] text-[14px] bg-[#2B7FFF] rounded-md text-white font-[500] cursor-pointer !w-[150px] flex justify-center items-center"
            >
              {newVisitLoading ? (
                <Spin
                  indicator={<LoadingOutlined spin />}
                  className="!text-white"
                />
              ) : (
                "Biriktirish"
              )}
            </button>
          </div>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}
