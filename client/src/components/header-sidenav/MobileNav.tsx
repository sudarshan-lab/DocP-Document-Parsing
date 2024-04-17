import {
    Flex,
    FlexProps,
    IconButton,
    useColorModeValue,
    Text,
    VStack,
    Box,
    MenuButton,
    MenuList,
    HStack,
    MenuDivider,
    MenuItem,
    Menu,
    Avatar,
  } from "@chakra-ui/react";
  import _ from "lodash";
  import { useEffect, useState } from "react";
  import { FiBell, FiChevronDown, FiMenu } from "react-icons/fi";
  import { useNavigate } from "react-router-dom";
  import Profile from "../profile/Profile";
  interface MobileProps extends FlexProps {
    onOpen: () => void;
  }
  const MobileNav = ({ onOpen, ...rest }: MobileProps) => {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState({});
    const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
    useEffect(() => {
      const user = JSON.parse(localStorage.getItem("userInfo") as string);
      setUserInfo(user);
    }, []);
  
    return (
      <Flex
        ml={{ base: 0, md: 60 }}
        px={{ base: 4, md: 4 }}
        height="20"
        alignItems="center"
        bg={useColorModeValue("white", "gray.900")}
        borderBottomWidth="1px"
        borderBottomColor={useColorModeValue("gray.200", "gray.700")}
        justifyContent={{ base: "space-between", md: "flex-end" }}
        {...rest}
      >
        <IconButton
          display={{ base: "flex", md: "none" }}
          onClick={onOpen}
          variant="outline"
          aria-label="open menu"
          icon={<FiMenu />}
        />
  
        <Text
          display={{ base: "flex", md: "none" }}
          fontSize="2xl"
          fontFamily="monospace"
          fontWeight="bold"
        >
          Logo
        </Text>
  
        <HStack spacing={{ base: "0", md: "6" }}>
          {/* <IconButton
            size="lg"
            variant="ghost"
            aria-label="open menu"
            icon={<FiBell />}
          /> */}
          <Flex alignItems={"center"}>
            <Menu>
              <MenuButton
                py={2}
                transition="all 0.3s"
                _focus={{ boxShadow: "none" }}
              >
                <HStack>
                  <Avatar
                    size={"sm"}
                    bg="purple.800"
                    textColor={"white"}
                    name={
                      _.capitalize((userInfo as any)?.firstName) +
                      "" +
                      _.capitalize((userInfo as any)?.lastName)
                    }
                    // src={
                    //   "https://images.unsplash.com/photo-1619946794135-5bc917a27793?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&fit=crop&h=200&w=200&s=b616b2c5b373a80ffc9636ba24f7a4a9"
                    // }
                  />
                  <VStack
                    display={{ base: "none", md: "flex" }}
                    alignItems="flex-start"
                    spacing="1px"
                    ml="2"
                  >
                    <Text
                      fontSize="md"
                      fontWeight={"semibold"}
                      textColor={"purple.900"}
                      mb="0"
                    >
                      {_.capitalize((userInfo as any)?.firstName)}{" "}
                      {_.capitalize((userInfo as any)?.lastName)}
                    </Text>
                    <Text
                      fontSize="sm"
                      textColor="green.800"
                      fontWeight={"semibold"}
                    >
                      {_.capitalize((userInfo as any)?.role)}
                    </Text>
                  </VStack>
                  <Box display={{ base: "none", md: "flex" }} mx="2">
                    <FiChevronDown size={18} />
                  </Box>
                </HStack>
              </MenuButton>
              <MenuList
                bg={useColorModeValue("white", "gray.900")}
                borderColor={useColorModeValue("gray.200", "gray.700")}
              >
                <MenuItem onClick={() => setShowProfileModal(true)}>
                  Profile
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  onClick={() => {
                    localStorage.setItem("userInfo", JSON.stringify({}));
                    localStorage.setItem("isActive", "INACTIVE");
                    navigate("/");
                  }}
                >
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </HStack>
        <Profile
        showModal={showProfileModal}
        setShowModal={setShowProfileModal}
      />
        
      </Flex>
    );
  };
  
  export default MobileNav;
  