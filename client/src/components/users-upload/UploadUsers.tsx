import React, { useEffect, useState } from "react";
import {
  Flex,
  VStack,
  Text,
  HStack,
  Button,
  Grid,
  Image,
  GridItem,
  Box,
  Divider,
} from "@chakra-ui/react";
import { Select, message } from "antd";
import { AiOutlineInbox, AiOutlineCloudUpload } from "react-icons/ai";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { Table } from "antd";
import Dashboard from "../dashboard/Dashboard";
import Upload from "../assets/upload.svg";
import { PUBLIC_URL } from "../common/utils";
import { JsonToTable } from "react-json-to-table";

const UploadUsers = () => {
  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({});
  const [tableColumns, setTableColumns] = useState([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [options, setOption] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState("");
  const [extractedData, setExtractedData] = useState<any>({});
  const [formData, setFormData] = useState({
    selectedContract: "",
    file: null,
  });
  const [fileUrl, setFileUrl] = useState("");
  const [file, setFile] = useState();

  useEffect(() => {
    axios
      .get(PUBLIC_URL + "/api/contract")
      .then((response) => {
        const contracts = response.data;
        const prepareData = contracts?.map((item: any) => ({
          label: item?.name,
          value: item?._id,
        }));
        setOption(prepareData);
      })
      .catch((error) => {
        console.log("ERROR: ", error);
        message.error("Error while updating user access...!");
      });
  }, []);

  useEffect(() => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0] as any);
      setFormData({ ...formData, file: acceptedFiles[0] as any });
    }
  }, [acceptedFiles]);

  const onSubmitClicked = async () => {
    setLoading(true);

    if (!selectedContract) {
      console.error("Please select a contract");
      message.error("please select a contract");
      setLoading(false);
      return;
    }
    if (!file) {
      console.error("Please select a file");
      message.error("please select a file");
      setLoading(false);
      return;
    }

    const user = JSON.parse(localStorage.getItem("userInfo") as string);
    const formDataWithContract = new FormData();
    formDataWithContract.append("file", formData.file as any);
    formDataWithContract.append("contractId", formData.selectedContract);
    formDataWithContract.append("userId", user?._id);

    try {
      const response = await axios.post(
        `${PUBLIC_URL}/upload`,
        formDataWithContract,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("Response from server:", response);
      setExtractedData(response.data.extractedData.data);
      setFileUrl(response.data.extractedData.fileS3Url);
      message.success("Data uploaded successfully..!");
      setFormData({
        selectedContract: "",
        file: null,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dashboard>
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <img
            src="https://cache.lovethispic.com/uploaded_images/310675-Animated-Cat-With-Headphones.gif"
            alt="loading-cat"
            style={{ width: "250px", height: "250px", borderRadius: "50%" }}
          />
        </div>
      )}
      <Grid templateColumns="repeat(2, 1fr)" gap={4}>
        <GridItem w="100%" bg={"white"} px="10" py="6" borderRadius={"lg"}>
          <Flex direction={"column"} alignItems={"start"}>
            <Text
              mb="4"
              textColor={"purple.900"}
              fontWeight={"semibold"}
              fontSize={"2xl"}
            >
              Submit Documents
            </Text>
            <Text>Select a contract </Text>
            <Flex mb="4" w="100%" direction={"column"}>
              <Select
                style={{ width: "50%" }}
                placeholder="select contract"
                onChange={(e) => {
                  setSelectedContract(e);
                  setFormData({
                    ...formData,
                    selectedContract: e,
                  });
                }}
                value={formData.selectedContract}
                optionLabelProp="label"
                options={options}
              />
            </Flex>

            <Flex direction={"column"} alignItems={"end"} w="full">
              <section
                style={{
                  width: "100%",
                  // border: "1px dashed",
                  // borderColor: "gray.400",
                  borderRadius: "md",
                  padding: "6px",
                  cursor: "pointer",
                }}
                {...getRootProps({ className: "dropzone" })}
              >
                <Flex
                  alignItems={"center"}
                  justifyContent={"center"}
                  border={"1px dashed"}
                  borderColor={"gray.400"}
                  px="6"
                  py="4"
                  w="full"
                  rounded={"md"}
                  cursor={"pointer"}
                  _hover={{ borderColor: "purple.800" }}
                >
                  <VStack gap={1}>
                    <input {...getInputProps()} />
                    <AiOutlineInbox size={"40px"} />
                    <Text mb="0">
                      Click or drag file to this area to upload
                    </Text>
                    <Text
                      fontWeight={"thin"}
                      textColor={"gray.700"}
                      fontSize={"xs"}
                      fontStyle={"italic"}
                    >
                      Support for a single or bulk upload. Strictly prohibited
                      from uploading company data or other banned files.
                    </Text>
                  </VStack>
                </Flex>
                <VStack mt="4">
                  {acceptedFiles?.map((file) => {
                    return (
                      <Flex
                        py="1"
                        px="4"
                        border="1px solid"
                        borderColor={"gray.100"}
                        w={"full"}
                        rounded={"md"}
                      >
                        <Text>File Name: {file.name}</Text>
                      </Flex>
                    );
                  })}
                </VStack>
              </section>

              <HStack mt={"3"} float={"right"}>
                <Button
                  bg="purple.900"
                  color={"white"}
                  _hover={{ bg: "purple.800" }}
                  leftIcon={<AiOutlineCloudUpload size={"20px"} />}
                  onClick={onSubmitClicked}
                >
                  Submit
                </Button>
              </HStack>
            </Flex>
          </Flex>
        </GridItem>
        <GridItem w="100%" bg={"white"} px="10" py="6" borderRadius={"lg"}>
          <Flex direction={"column"} alignItems={"start"} w="100%">
            <Text
              mb="2"
              textColor={"purple.800"}
              fontWeight={"semibold"}
              fontSize={"2xl"}
            >
              Instructions
            </Text>
            <Divider />
            <Flex justifyContent={"space-between"} w="100%" mt="3">
              <Flex
                gap={1}
                direction={"column"}
                textColor={"gray.700"}
                fontSize={"sm"}
                fontStyle={"italic"}
                alignItems={"start"}
                justifyContent={"start"}
                mt="2"
              >
                <Text mb="1" fontSize={"md"}>
                  1) Select a contract from the dropdown box.
                </Text>
                <Text fontSize={"md"}>
                  2) Upload relevant documents based on contract.
                </Text>
              </Flex>
              <Image src={Upload} maxW={"52"} mr="10" />
            </Flex>
          </Flex>
        </GridItem>

        {extractedData.length > 0 && (
          <GridItem
            w="100%"
            bg={"white"}
            px="10"
            py="6"
            borderRadius={"lg"}
            overflowY="auto"
          >
            <Flex direction={"column"} alignItems={"start"} w="100%">
              <Text
                mb="2"
                textColor={"purple.800"}
                fontWeight={"semibold"}
                fontSize={"2xl"}
              >
                Uploaded file
              </Text>
              <Divider />
              <Flex justifyContent="space-between" w="100%" mt="3">
                <Box flex="1">
                  <iframe
                    src={fileUrl}
                    style={{ width: "100%", height: "600px", border: "none" }}
                  />
                </Box>
              </Flex>
            </Flex>
          </GridItem>
        )}
        {extractedData.length > 0 && (
          <GridItem w="100%" bg={"white"} px="10" py="6" borderRadius={"lg"}>
            <Flex direction={"column"} alignItems={"start"} w="100%">
              <Text
                mb="2"
                textColor={"purple.800"}
                fontWeight={"semibold"}
                fontSize={"2xl"}
              >
                Users Data
              </Text>
              <Divider />
              <Flex justifyContent="space-between" w="100%" mt="3">
                <Box flex="1" fontSize="xl">
                  <JsonToTable json={JSON.parse(extractedData)} />
                </Box>
              </Flex>
            </Flex>
          </GridItem>
        )}
      </Grid>
    </Dashboard>
  );
};

export default UploadUsers;
