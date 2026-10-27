import { AutoComplete, Empty, Form, Pagination, Spin } from "antd";
import { Link } from "react-router-dom";
import { LuUser } from "react-icons/lu";
import { BsTelephone } from "react-icons/bs";
import { PiCalendarDotsLight } from "react-icons/pi";
import { useQuery } from "react-query";
import { LoadingOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { OneMedAdmin } from "../queries/query";

type PatientSearchItem = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  gender: "male" | "female";
  status: string;
  date_of_birth: string;
  last_visit_date: string | null;
};

type PaginationMeta = {
  total_pages: number;
  total_items: number;
  current_page: number;
};

type PatientSearchResponse = {
  success: boolean;
  message: string;
  data: PatientSearchItem[];
  meta: PaginationMeta;
};

export default function Patients() {
  const [page, setPage] = useState(1);
  const per_page = 10;
  const [searchText, setSearchText] = useState(""); // input uchun
  const [status, setStatus] = useState("");
  const [selectedPatient, setSelectedPatient] =
    useState<PatientSearchItem | null>(null); // tanlangan bemor

  const { data, isLoading } = useQuery<PatientSearchResponse>({
    queryKey: ["patients", page, per_page, searchText, status],
    queryFn: () =>
      OneMedAdmin.getPatientsAll(page, per_page, searchText, status),
    keepPreviousData: true,
  });

  // AutoComplete options
  const options =
    data?.data.map((item) => ({
      value: `${item.first_name} ${item.last_name}`,
      label: `${item.first_name} ${item.last_name}`,
      key: item.id,
      item, // keyin qayta ishlatamiz
    })) || [];

  useEffect(() => {
    setSearchText("");
  }, []);

  const handleSearch = (val: string) => {
    setSearchText(val);
    setSelectedPatient(null);
  };

  const handleSelect = (_val: string, option: any) => {
    setSelectedPatient(option.item); // butun bemorni saqlaymiz
  };

  if (isLoading) {
    return (
      <div className="absolute left-0 top-0 z-[9999] w-full h-screen flex justify-center items-center bg-white/20 backdrop:blur-2xl">
        <Spin indicator={<LoadingOutlined spin />} size="large" />
      </div>
    );
  }

  // Helper render function
  const renderPatientCard = (item: PatientSearchItem) => {
    const age =
      new Date().getFullYear() - Number(item.date_of_birth.slice(0, 4));
    const gender =
      item.gender === "male" ? "Erkak" : item.gender === "female" ? "Ayol" : "";

    return (
      <Link
        key={item.id}
        to={`${item.id}`}
        className="px-6 hover:shadow-md transition-all duration-150 py-4 mb-3 border border-[#E0E6EB] flex items-center justify-between rounded-[10px] bg-[#fff] "
      >
        <div className="flex items-center gap-3">
          <div className="md:w-[50px] md:h-[50px] w-[35px] h-[35px] flex justify-center items-center rounded-full bg-[#E7F0FA] text-[#2A81D8] md:text-[24px] text-[16px]">
            <LuUser />
          </div>
          <div>
            <h3 className="md:text-[18px] text-[12px] font-[600]">
              {item.first_name} {item.last_name}
            </h3>
            <p className="md:text-[14px] text-[10px] hidden md:flex text-[#8b8b8b] gap-2">
              {age} yosh, bemor {gender} <BsTelephone /> {item.phone}
              <span className="ml-2">
                So‘ngi tashrif: {item.last_visit_date}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-2.5 py-1 rounded-full text-[#5AA6F2] bg-[#EEF6FD] flex items-center md:text-[14px] text-[10px] gap-1.5">
            <PiCalendarDotsLight className="text-[16px]" />
            <span>{item.last_visit_date}</span>
          </button>
          <button className="text-[14px] md:block hidden text-white bg-[#1DC981] px-2.5 py-1 rounded-full">
            {item.status}
          </button>
        </div>
      </Link>
    );
  };

  return (
    <div className="pr-[10px] md:pr-auto">
      {/* Search section */}
      <div className="px-6 py-6 border border-[#E0E6EB] rounded-[10px] flex flex-col md:flex-row items-center gap-3 mt-4">
        <Form className="md:flex-1 !w-full">
          <Form.Item name="search" className="!m-0 relative flex-1">
            <AutoComplete
              options={options}
              onSelect={handleSelect}
              onSearch={handleSearch}
              placeholder="Bemor qidiring..."
              className="!w-full !h-[40px]"
              notFoundContent="Bemor topilmadi!"
            />
          </Form.Item>
        </Form>

        <div className="flex items-center gap-2 justify-between md:justify-end w-full md:w-auto">
          {["", "active", "nonactive"].map((r) => (
            <button
              key={r}
              onClick={() => {
                setStatus(r);
                setSelectedPatient(null); // filter bosilganda ham reset
              }}
              className={`px-3 py-2 border border-[#eaeaea] rounded-[6px] ${
                status === r ? "bg-[#2D80FF] text-white" : "text-black"
              } cursor-pointer text-[14px] md:h-[41px] hover:shadow-md transition-all duration-150`}
            >
              {r === "" ? "Barchasi" : r === "active" ? "Faol" : "Nofaol"}
            </button>
          ))}
        </div>
      </div>

      {/* Patients info */}
      <div className="mt-[14px]">
        {selectedPatient ? (
          renderPatientCard(selectedPatient) // tanlangan bitta bemor
        ) : data?.data.length && data?.data.length > 0 ? (
          data?.data.map(renderPatientCard)
        ) : (
          <Empty />
        )}

        {/* Pagination */}
        {data?.meta?.total_items
          ? !selectedPatient &&
            data?.meta?.total_items > per_page && (
              <div className="px-6 py-4 border border-[#E0E6EB] flex items-center justify-end rounded-[10px] bg-[#fff] mb-5">
                <Pagination
                  current={page}
                  pageSize={per_page}
                  onChange={(p) => setPage(p)}
                  total={data.meta.total_items}
                />
              </div>
            )
          : ""}
      </div>
    </div>
  );
}
