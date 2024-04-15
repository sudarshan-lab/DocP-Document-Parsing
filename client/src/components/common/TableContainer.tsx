import { Button, Flex, Text } from "@chakra-ui/react";
import { Table, TableProps } from "antd";
import { AnyObject } from "antd/es/_util/type";
import { MouseEventHandler } from "react";
interface TableContainerProps<R extends AnyObject> extends TableProps<R> {
  titleName?: string;
  titleButtons?: {
    name: String;
    showTitleButton: boolean;
    onButtonClicked?: MouseEventHandler<HTMLButtonElement>;
    leftIcons?: any;
  };
}
const TableContainer = <R extends AnyObject>(props: TableContainerProps<R>) => {
  const { titleName, titleButtons, ...rest } = props;
  return (
    <Flex direction={"column"} w="100%">
      <Flex justifyContent={"space-between"} alignItems={"center"} my="4">
        <Text fontSize={"2xl"} fontWeight={"semibold"}>
          {titleName}
        </Text>
        {titleButtons?.showTitleButton && (
          <Button
            bg="purple.900"
            color={"white"}
            _hover={{ bg: "purple.800" }}
            onClick={titleButtons.onButtonClicked}
            leftIcon={titleButtons.leftIcons}
          >
            {titleButtons?.name}
          </Button>
        )}
      </Flex>
      <Table {...rest} style={{ width: "100%" }} />
    </Flex>
  );
};

export default TableContainer;
