import {
    Button,
    Divider,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
  } from "@chakra-ui/react";
  import React, { ReactNode } from "react";
  import { AiOutlineClose } from "react-icons/ai";
  import { TfiAnnouncement } from "react-icons/tfi";
  interface ModalContainerProps {
    isOpen: boolean;
    onClose: () => void;
    submitButtonName: string;
    onSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
    title: string;
    body: ReactNode;
  }
  function ModalContainer(props: ModalContainerProps) {
    const { isOpen, onClose, onSubmit, submitButtonName, title, body } = props;
    return (
      <Modal isOpen={isOpen} onClose={onClose} size={"2xl"}>
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={onSubmit}>
            <ModalHeader textColor={"purple.800"}>{title}</ModalHeader>
            <ModalCloseButton />
            <Divider />
            <ModalBody py={"4"}>{body}</ModalBody>
            <Divider />
            <ModalFooter>
              <Button
                colorScheme="gray"
                mr={3}
                onClick={onClose}
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
                {submitButtonName}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    );
  }
  
  export default ModalContainer;
  