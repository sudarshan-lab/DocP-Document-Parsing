import {
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Stack,
  Textarea,
} from "@chakra-ui/react";
import { DatePicker, message } from "antd";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AiOutlineClose } from "react-icons/ai";
import { TfiAnnouncement } from "react-icons/tfi";
import dayjs from "dayjs";
import axios from "axios";
import { PUBLIC_URL } from "../common/utils";
import { getDefaultContract } from "../common/default-values";
import { EditType } from "./Announcement";
import {
  prepareAnnouncements,
  prepareAnnouncementsStats,
} from "../common/prepare-data";
import { AnnouncementsStats } from "../common/data-types";
const { RangePicker } = DatePicker;

interface CreateFaqFormProps {
  showModal: boolean;
  setShowModal: (_open: boolean) => void;
  edit?: EditType;
  setEdit?: React.Dispatch<React.SetStateAction<EditType>>;
  setContracts?: React.Dispatch<React.SetStateAction<any>>;
  getAllContracts?: any;
  setContractssStats?: any;
  setEditAnnoucement: any;
}
const CreatAnnouncement = (props: CreateFaqFormProps) => {
  const {
    setShowModal,
    showModal,
    edit,
    setContracts,
    getAllContracts,
    setContractssStats,
    setEditAnnoucement,
  } = props;
  const [contractData, setContractData] = useState(getDefaultContract());
  const { register, handleSubmit, setValue } = useForm();

  useEffect(() => {
    setContractData({
      id: edit?.data?.key as string,
      name: edit?.data.name as string,
      description: edit?.data?.description as string,
      prompt: edit?.data?.prompt as string,
    });

    setValue("title", edit?.data.name as string);
    setValue("description", edit?.data?.description as string);
    setValue("assignee", edit?.data?.prompt as string);
  }, [edit?.data, setValue]);

  const onSubmitClicked = () => {
    if (edit?.forEdit) {
      axios
      .put(`/api/contract/${contractData?.id}`, contractData)
        .then((response) => {
          message.success("Updated contract..!");
          setShowModal(false);
          setContractData(getDefaultContract());
          setContracts && setContracts(response.data.announcement as any);
          getAllContracts();
          setContractssStats(
            prepareAnnouncementsStats(
              prepareAnnouncements(response.data.announcement)
            ) as AnnouncementsStats
          );
          setEditAnnoucement({ forEdit: false, data: {} });
          resetValues();
        })
        .catch((error) => {
          console.log("ERROR: ", error);
          message.error("Error while updating contract..!");
        });
    } else {
      axios
        .post("/api/contract", contractData)
        .then((response) => {
          message.success("Created contract..!");
          setShowModal(false);
          setContractData(getDefaultContract());
          setContracts && setContracts(response.data.announcement as any);
          getAllContracts();
          setContractssStats(
            prepareAnnouncementsStats(
              prepareAnnouncements(response.data.announcement)
            ) as AnnouncementsStats
          );
          resetValues();
        })
        .catch((error) => {
          console.log("ERROR: ", error);
          message.error("Error while creating annoucement..!");
        });
    }
  };

  const resetValues = () => {
    setValue("title", "");
    setValue("description", "");
    setValue("assignee", "all");
  };

  return (
    <Modal
      isOpen={showModal}
      onClose={() => {
        setShowModal(false);
        setContractData(getDefaultContract());
        resetValues();
        setEditAnnoucement({ forEdit: false, data: {} });
      }}
      size={"2xl"}
    >
      <ModalOverlay />
      <ModalContent>
        <form>
          <ModalHeader textColor={"purple.800"}>
            {edit?.forEdit ? "Edit Contract" : "Create Contract Form"}
          </ModalHeader>
          <ModalCloseButton />
          <Divider />
          <ModalBody py={"4"}>
            <FormControl
              isRequired
              isInvalid={contractData?.name?.length === 0}
            >
              <FormLabel fontSize={"sm"} textColor={"gray.700"}>
                Name
              </FormLabel>
              <Input
                type="text"
                placeholder="Enter name here..."
                value={contractData?.name}
                {...register("name", { required: true })}
                onChange={(e) =>
                  setContractData({
                    ...contractData,
                    name: e.target.value,
                  })
                }
              />
              <FormErrorMessage>Name is required.</FormErrorMessage>
            </FormControl>
            <FormControl
              isRequired
              isInvalid={contractData?.prompt?.length === 0}
            >
              <FormLabel fontSize={"sm"} textColor={"gray.700"}>
                Prompt
              </FormLabel>
              <Textarea
                
                placeholder="Enter prompt here..."
                value={contractData?.prompt}
                {...register("title", { required: true })}
                onChange={(e) =>
                  setContractData({
                    ...contractData,
                    prompt: e.target.value,
                  })
                }
              />
              <FormErrorMessage>Prompt is required.</FormErrorMessage>
            </FormControl>
            <FormControl
              mt="3"
              isRequired
              isInvalid={contractData?.description?.length === 0}
            >
              <FormLabel fontSize={"sm"} textColor={"gray.700"}>
                Description
              </FormLabel>
              <Textarea
                placeholder="Enter details here..."
                value={contractData.description}
                {...register("description", { required: true })}
                onChange={(e) =>
                  setContractData({
                    ...contractData,
                    description: e.target.value,
                  })
                }
              />
              <FormErrorMessage>Description is required.</FormErrorMessage>
            </FormControl>
          </ModalBody>
          <Divider />
          <ModalFooter>
            <Button
              colorScheme="gray"
              mr={3}
              onClick={() => {
                setShowModal(false);
                setContractData(getDefaultContract());
                resetValues();
                setEditAnnoucement({ forEdit: false, data: {} });
              }}
              leftIcon={<AiOutlineClose />}
            >
              Close
            </Button>
            <Button
              bg="purple.900"
              color={"white"}
              _hover={{ bg: "purple.800" }}
              leftIcon={<TfiAnnouncement />}
              onClick={onSubmitClicked}
            >
              {edit?.forEdit ? "Edit Contract" : "Create Contract"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default CreatAnnouncement;