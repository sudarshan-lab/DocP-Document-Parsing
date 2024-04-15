import { Flex, Text } from "@chakra-ui/react";
import React from "react";
import { BsDatabaseExclamation } from "react-icons/bs";

function NoData() {
  return (
    <Flex direction={"column"} alignItems={"center"}>
      <BsDatabaseExclamation size={40} />
      <Text mt="2"> No Data present..!</Text>
    </Flex>
  );
}

export default NoData;
