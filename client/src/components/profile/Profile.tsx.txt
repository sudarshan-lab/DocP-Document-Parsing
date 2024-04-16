import React, { useEffect, useState } from "react";
import {
  Button,
  Divider,
  Flex,
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
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { AiOutlineClose } from "react-icons/ai";
import { TfiAnnouncement } from "react-icons/tfi";
import axios from "axios";
import { PUBLIC_URL } from "../common/utils";
import { message } from "antd";
interface ProfileProps {
  showModal: boolean;
  setShowModal: (_open: boolean) => void;
  edit?: any;
}
function Profile(props: ProfileProps) {
  const { setShowModal, showModal } = props;
  const [usersData, setUserData] = useState<Partial<any>>();
  const {
    handleSubmit,
    register,
    formState: { errors },
    getValues,
  } = useForm({
    defaultValues: {
      firstName: usersData?.firstName,
      lastName: usersData?.lastName,
      email: usersData?.email,
      phoneNumber: usersData?.phoneNumber,
      addressLine1: usersData?.address?.addressLine1,
      addressLine2: usersData?.address?.addressLine1,
      city: usersData?.address?.city,
      state: usersData?.address?.state,
    },
  });

  const [formData, setFormData] = useState<any>();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo") as string);
    setUserData({
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      phoneNumber: user?.phoneNumber,
      addressLine1: usersData?.address?.addressLine1,
      addressLine2: usersData?.address?.addressLine1,
      city: usersData?.address?.city,
      state: usersData?.address?.state,
    });
    setFormData({
      ...formData,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      phoneNumber: user?.phoneNumber,
      addressLine1: usersData?.address?.addressLine1,
      addressLine2: usersData?.address?.addressLine1,
      city: usersData?.address?.city,
      state: usersData?.address?.state,
    });
  }, []);

  const onSubmitClicked = () => {
    axios
      .put(PUBLIC_URL + "/users/update-profile", formData)
      .then((response) => {
        message.success("User profile updated successfully...!");
        localStorage.setItem("userInfo", JSON.stringify(response.data.users));
      })
      .catch((error) => {
        console.log("ERROR: ", error);
        message.success("Failed to update User profile...!");
      });
  };
  return (
    <Modal
      isOpen={showModal}
      onClose={() => {
        setShowModal(false);
      }}
      size={"2xl"}
    >
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmitClicked)}>
          <ModalHeader textColor={"purple.800"}>{"Profile"}</ModalHeader>
          <ModalCloseButton />
          <Divider />
          <ModalBody py={"4"}>
            <form onSubmit={handleSubmit(onSubmitClicked)}>
              <Flex direction={"column"} mx="2">
                <FormControl isInvalid={!!errors["firstName"]} mt="2">
                  <FormLabel
                    id="firstName"
                    fontSize={"xs"}
                    textColor="gray.600"
                    fontWeight={"semibold"}
                  >
                    First Name:
                  </FormLabel>
                  <Input
                    type={"text"}
                    {...register("firstName", {
                      required: "First Name is required",
                    })}
                    defaultValue={usersData?.firstName}
                    onChange={(e) => {
                      const userData = {
                        ...formData,
                        firstName: e.target.value,
                      };
                      setFormData(userData as any);
                    }}
                  />
                  <FormErrorMessage>
                    {errors["firstName"]?.message as string}
                  </FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors["lastName"]} mt="2">
                  <FormLabel
                    fontSize={"xs"}
                    textColor="gray.600"
                    fontWeight={"semibold"}
                  >
                    Last Name:
                  </FormLabel>
                  <Input
                    type={"text"}
                    {...register("lastName", {
                      required: "Last Name is required",
                    })}
                    defaultValue={usersData?.lastName}
                    onChange={(e) => {
                      const userData = {
                        ...formData,
                        lastName: e.target.value,
                      };
                      setFormData(userData as any);
                    }}
                  />
                  <FormErrorMessage>
                    {errors["lastName"]?.message as string}
                  </FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors["email"]} mt="2">
                  <FormLabel
                    fontSize={"xs"}
                    textColor="gray.600"
                    fontWeight={"semibold"}
                  >
                    Email:
                  </FormLabel>
                  <Input
                    type={"email"}
                    defaultValue={usersData?.email}
                    isDisabled={true}
                    onChange={(e) => {
                      const userData = {
                        ...formData,
                        email: e.target.value,
                      };
                      setFormData(userData as any);
                    }}
                  />
                  <FormErrorMessage>
                    {errors["email"]?.message as string}
                  </FormErrorMessage>
                </FormControl>
               
              </Flex>
            </form>
          </ModalBody>
          <Divider />
          <ModalFooter>
            <Button
              colorScheme="gray"
              mr={3}
              onClick={() => {
                setShowModal(false);
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
              type="submit"
            >
              {"Update Profile"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

export default Profile;
