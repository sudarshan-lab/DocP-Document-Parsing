import React, { useEffect, useState } from "react";
import {
  Flex,
  Text,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Select,
  HStack,
} from "@chakra-ui/react";
import axios from "axios";
import Dashboard from "../dashboard/Dashboard";
import { JsonToTable } from "react-json-to-table";
import { AiFillEye, AiOutlineSync, AiTwotoneBulb } from "react-icons/ai";
import dayjs from "dayjs";
import TableContainer from "../common/TableContainer";


const History = () => {
  const [userData, setUserData] = useState([]);
  const [selectedData, setSelectedData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [filterUsername, setFilterUsername] = useState("");
  const [filterContract, setFilterContract] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    const id = user._id;
    axios
      .get(`/api/history/${id}`)
      .then((response) => {
        setUserData(response.data);
        console.log(response.data);
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
      });
  }, []);

  const handleDataClick = (data) => {
    setSelectedData(JSON.parse(data));
    setShowModal(true);
  };

  const handleFileClick = (fileS3Url) => {
    window.open(fileS3Url, "_blank");
  };

  const uniqueContracts = Array.from(
    new Set(userData.map((user) => user.contractId?.name))
  );

  const filteredUserData = userData.filter((user) => {
    let result = true;

    if (filterUsername) {
      result =
        result &&
        user.UserId.firstName
          .toLowerCase()
          .includes(filterUsername.toLowerCase());
    }

    if (filterContract) {
      result =
        result &&
        user.contractId?.name
          .toLowerCase()
          .includes(filterContract.toLowerCase());
    }

    return result;
  });

  const columns = [
    {
      title: "Contract Type",
      dataIndex: ["contractId","name"],
      
    },
    {
      title: "File Name",
      dataIndex: "fileName",
      render: (text, record) => {
        return <Text fontWeight={"semibold"}  cursor={"pointer"} textColor={"purple.800"} onClick={() => handleFileClick(record.fileS3Url)}>{text}</Text>;
      },
    },
    {
      title: "Date",
      dataIndex: "modifiedDate",
      render: (text, record) => {
        return <Text>{dayjs(text).format("MM-DD-YYYY hh:MMa")}</Text>;
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <HStack gap={2} cursor={"pointer"}>
          <AiFillEye size={20} style={{ margin: "0 2px" }}   onClick={() =>  handleDataClick(record.data)}/>
        </HStack>
      ),
    },
  ];

  const onChange  = (
    pagination,
    filters,
    sorter,
    extra
  ) => {
    console.log("params", pagination, filters, sorter, extra);
  };
 
  return (
    <Dashboard>
      <Flex
        direction="column"
        mt={8}
        background={"white"}
        rounded={"md"}
        shadow={"base"}
        py="4"
        px="6"
      >
        <Flex justifyContent={"space-between"}>
          <Text
            fontSize="3xl"
            fontWeight="semibold"
            color="purple.900"
          >
           History 
          </Text>
          <Flex w={"56"}>
          <Select
            placeholder="Select Contract"
            value={filterContract}
            onChange={(e) => setFilterContract(e.target.value)}
          >
            {uniqueContracts.map((contract) => (
              <option key={contract} value={contract}>
                {contract}
              </option>
            ))}
          </Select>
          </Flex>
         
        </Flex>

        <TableContainer
          columns={columns}
          dataSource={filteredUserData}
          onChange={onChange}
          pagination={{ pageSize: 5 }}
        />
      </Flex>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="3xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Parsed Data</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedData && <JsonToTable json={selectedData} />}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="purple"
              mr={3}
              onClick={() => setShowModal(false)}
              color="white"
              bg="purple.800"
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Dashboard>
  );
};

export default History;
