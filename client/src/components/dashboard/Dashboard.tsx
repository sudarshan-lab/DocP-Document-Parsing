import {
    Box,
    Drawer,
    DrawerContent,
    useDisclosure,
    Flex,
    Text,
  } from "@chakra-ui/react";
  import MobileNav from "../header-sidenav/MobileNav";
  import SideNav from "../header-sidenav/SideBar";
  import { ReactNode, useEffect, useMemo, useState } from "react";
  import { TbInfoTriangle } from "react-icons/tb";
  import { RxCross2 } from "react-icons/rx";
  import axios from "axios";
  import { message } from "antd";
  
  interface DashboardProps {
    title?: ReactNode;
    children?: ReactNode;
  }
  
  const Dashboard = (props: DashboardProps) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { children } = props;
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [announcements, setAnnouncements] = useState([]);
  
    useEffect(() => {
      const loggedin = localStorage.getItem("isActive") === "ACTIVE";
      setIsLoggedIn(loggedin);
    }, [localStorage.getItem("isActive")]);
  
    return isLoggedIn ? (
      <Box minH="100vh" bg={"gray.100"}>
        <SideNav
          onClose={() => onClose}
          display={{ base: "none", md: "block" }}
        />
        <Drawer
          isOpen={isOpen}
          placement="left"
          onClose={onClose}
          returnFocusOnClose={false}
          onOverlayClick={onClose}
          size="full"
        >
          <DrawerContent>
            <SideNav onClose={onClose} />
          </DrawerContent>
        </Drawer>
        <MobileNav onOpen={onOpen} />
        <Box ml={{ base: 0, md: 60 }} p="4">
          {children}
        </Box>
      </Box>
    ) : (
      <Flex w={"100%"}>{children}</Flex>
    );
  };
  
  export default Dashboard;
  