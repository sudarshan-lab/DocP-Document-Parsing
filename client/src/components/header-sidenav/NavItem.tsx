import { Box, Flex, FlexProps, Icon } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { IconType } from "react-icons";

interface NavItemProps extends FlexProps {
  icon: IconType;
  activeStep: number;
  index: number;
  setActiveStep: (step: number) => void;
  path: string;
  children: React.ReactNode;
}

const NavItem = ({
  icon,
  activeStep,
  setActiveStep,
  index,
  path,
  children,
  ...rest
}: NavItemProps) => {
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    const stepValue = Number(localStorage.getItem("activeStep"));
    setStep(stepValue);
  }, [localStorage.getItem("activeStep")]);

  return (
    <Box
      as="a"
      href={path}
      style={{ textDecoration: "none" }}
      _focus={{ boxShadow: "none" }}
      shadow={step === index ? "xl" : "none"}
      onClick={() => {
        setActiveStep(index);
        localStorage.setItem("activeStep", index.toString());
      }}
    >
      <Flex
        align="center"
        p="4"
        mx="4"
        mb="1"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        bg={step === index ? "purple.900" : "white"}
        textColor={step === index ? "white" : "purple.900"}
        _hover={{
          bg: "purple.900",
          color: "white",
        }}
        {...rest}
      >
        {icon && (
          <Icon
            mr="4"
            fontSize="16"
            _groupHover={{
              color: "white",
            }}
            as={icon}
          />
        )}
        {children}
      </Flex>
    </Box>
  );
};

export default NavItem;
