import React, { useEffect, useState } from "react";
import TableContainer from "../common/TableContainer";
import { Button, Flex, HStack, Text, Divider } from "@chakra-ui/react";
import { ColumnsType, TableProps } from "antd/es/table";
import CreatAnnouncement from "./CreateAnnouncement";
import { TbClockExclamation } from "react-icons/tb";
import { TfiAlarmClock, TfiAnnouncement } from "react-icons/tfi";
import { AiOutlineCodeSandbox } from "react-icons/ai";
import axios from "axios";
import { PUBLIC_URL } from "../common/utils";
import {
  prepareAnnouncements,
  prepareAnnouncementsStats,
} from "../common/prepare-data";
import {
  AnnouncementDataType,
  AnnouncementsStats,
  ContractDataType,
} from "../common/data-types";
import _ from "lodash";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import Dashboard from "../dashboard/Dashboard";
import { message } from "antd";
import dayjs from "dayjs";
import { LuCalendarClock } from "react-icons/lu";
export interface EditType {
  forEdit: boolean;
  data: Partial<ContractDataType>;
}
const Announcement = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [contract, setContracts] = useState([]);
  const [editAnnouncement, setEditAnnoucement] = useState<EditType>({
    forEdit: false,
    data: {},
  });
  const [announcementsStatsData, setAnnouncementsStats] =
    useState<AnnouncementsStats>({
      total: 0,
      running: 0,
      published: 0,
      upcomming: 0,
    });

  const columns: ColumnsType<ContractDataType> = [
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Description",
      dataIndex: "description",
    },
    {
      title: "Prompt",
      dataIndex: "prompt",
      render: (text: string, record: any) => {
        return <Text>{text?.substring(0, 60) + "..."}</Text>;
      },
    },
    {
      title: "Created Date",
      dataIndex: "addedDate",
    },
    {
      title: "Modified Date",
      dataIndex: "modifiedDate",
    },
    {
      title: "Action",
      key: "action",
      render: (_, record: any) => (
        <HStack gap={2}>
          <FiEdit
            size={18}
            style={{ cursor: "pointer" }}
            onClick={() => {
              setShowModal(true);
              setEditAnnoucement({
                forEdit: true,
                data: record,
              });
            }}
          />
          <MdDeleteOutline
            size={22}
            style={{ cursor: "pointer" }}
            onClick={() => onDeleteClicked(record.key)}
          />
        </HStack>
      ),
    },
  ];

  const onChange: TableProps<AnnouncementDataType>["onChange"] = (
    pagination,
    filters,
    sorter,
    extra
  ) => {
    console.log("params", pagination, filters, sorter, extra);
  };
  const getIcons = (name: string) => {
    if (name === "total") {
      return (
        <Flex bg="#710b79" rounded={"full"} p="5">
          <AiOutlineCodeSandbox size={40} color="#fff" />
        </Flex>
      );
    } else if (name === "running") {
      return (
        <Flex bg="#f88810" rounded={"full"} p="5">
          <TfiAlarmClock size={40} color="#fff" />
        </Flex>
      );
    } else if (name === "published") {
      return (
        <Flex bg="#5bc7e1" rounded={"full"} p="5">
          <TbClockExclamation size={40} color="#fff" />
        </Flex>
      );
    } else {
      return (
        <Flex bg="#0331a1" rounded={"full"} p="5">
          <LuCalendarClock size={36} color="#fff" />
        </Flex>
      );
    }
  };

  const announcementStats = (name: string, value: number) => {
    return (
      <Flex
        key={name}
        px="10"
        py="4"
        minH={"32"}
        w="100%"
        rounded={"md"}
        alignItems={"center"}
      >
        {getIcons(name)}
        <Flex direction={"column"} alignItems={"start"} mx="4">
          <Text textColor={"gray.800"} mb="0" fontSize={"lg"}>
            {_.capitalize(name)}
          </Text>
          <Text textColor={"gray.600"} fontSize={"5xl"} fontWeight={"bold"}>
            {value}
          </Text>
        </Flex>
      </Flex>
    );
  };

  const onDeleteClicked = (id: string) => {
    axios
      .delete(PUBLIC_URL + `/api/contract/${id}`, {
        params: {
          id: id,
        },
      })
      .then((response) => {
        setContracts(response.data.contract);
        getAllContracts();
        setAnnouncementsStats(
          prepareAnnouncementsStats(
            prepareAnnouncements(response.data.contract)
          ) as AnnouncementsStats
        );
        message.success("Deleted contract successfully..!");
      })
      .catch((error) => {
        console.log("ERROR: ", error);
        message.error("Failed to delete contract..!");
      });
  };

  useEffect(() => {
    axios
      .get(PUBLIC_URL + "/api/contract")
      .then((response) => {
        setContracts(response.data);
        setAnnouncementsStats(
          prepareAnnouncementsStats(
            prepareAnnouncements(response.data.contract)
          ) as AnnouncementsStats
        );
      })
      .catch((error) => {
        console.log("ERROR: ", error);
      });
  }, []);

  const getAllContracts = () =>{
    axios
      .get(PUBLIC_URL + "/api/contract")
      .then((response) => {
        setContracts(response.data);
        getAllContracts();
        setAnnouncementsStats(
          prepareAnnouncementsStats(
            prepareAnnouncements(response.data.contract)
          ) as AnnouncementsStats
        );
      })
      .catch((error) => {
        console.log("ERROR: ", error);
      });
  }

  return (
    <Dashboard>
      <Flex direction={"column"} mx="6">
        <Flex justifyContent={"space-between"} alignItems={"center"} mt="4">
          <Text
            fontSize={"2xl"}
            fontWeight={600}
            fontFamily={"Questrial', sans-serif"}
          >
            {"Contract Management"}
          </Text>
          <Button
            bg="purple.900"
            color={"white"}
            _hover={{ bg: "purple.800" }}
            onClick={() => setShowModal(true)}
            leftIcon={<TfiAnnouncement />}
          >
            Create Contract
          </Button>
        </Flex>
        {/* <Flex
          width={"100%"}
          justifyContent={"space-between"}
          bg="white"
          rounded={"lg"}
          px="6"
          direction={"column"}
          alignItems={"start"}
          py="4"
          bgGradient="linear(to bottom, #cfd9df 0%, #e2ebf0 100%);"
        >
          <Text
            textColor={"gray.900"}
            fontSize={"lg"}
            letterSpacing={"wide"}
            fontWeight={"semibold"}
            lineHeight={"tall"}
          >
            Contract Metrics
          </Text>
          <Divider my="2" borderColor={"gray.400"} />
          {/* <HStack w="full">
            {Object.entries(announcementsStatsData).map(([key, value]) => {
              return announcementStats(key, value);
            })}
          </HStack> 
        </Flex> */}

        <TableContainer
          columns={columns as any}
          dataSource={prepareAnnouncements(contract) as any}
          onChange={onChange}
          pagination={{ pageSize: 5 }}
        />
        <CreatAnnouncement
          showModal={showModal}
          setShowModal={setShowModal}
          edit={editAnnouncement}
          setEdit={setEditAnnoucement}
          setContracts={setContracts}
          getAllContracts={getAllContracts}
          setContractssStats={setAnnouncementsStats}
          setEditAnnoucement={setEditAnnoucement}
        />
      </Flex>
    </Dashboard>
  );
};

export default Announcement;
