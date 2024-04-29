import {
    Box,
    Divider,
    Flex,
    Grid,
    GridItem,
    Text,
    VStack,
    Stat,
    StatLabel,
  } from "@chakra-ui/react";
  import React, { useEffect, useState } from "react";
  import axios from "axios";
  import Dashboard from "./Dashboard";
  import { Line, LineChart, XAxis, YAxis } from "recharts";
  
  function AdminDashboard() {
    // Define the Contract interface
    interface Contract {
      contractName: string;
      documentsUploaded: number;
      // Add other properties as needed
    }
  
    const [contractDocuments, setContractDocuments] = useState<Contract[]>([]);
  
    useEffect(() => {
      axios
        .get("http://ec2-50-17-74-223.compute-1.amazonaws.com:9000/api/dashboardcontracts")
        .then((response) => {
          console.log(response);
          setContractDocuments(response.data.contracts);
        })
        .catch((error) => {
          console.log("Error fetching contract documents:", error);
        });
    }, []);
  
    const getStatusComponent = () => {
      return (
        <Grid templateColumns="repeat(3, 1fr)" gap={6}>
          {contractDocuments.map((contract) => (
            <GridItem colSpan={1} rowSpan={1} key={contract.contractName}>
              <Flex
                bg="white"
                shadow="md"
                p="4"
                rounded="md"
                alignItems="center"
                justifyContent="space-between"
                minH="32"
                maxW="full"
                position="relative"
              >
                <Box flex="1">
                  <VStack spacing="2" alignItems="start">
                    <Text fontSize="xl" fontWeight="semibold">
                      {contract.contractName}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
    Total Documents{" "}
    <Text fontSize="2xl" color="gray.700" fontWeight="bold">
      {contract.documentsUploaded}
    </Text>
  </Text>
                  </VStack>
                </Box>
                <Box flex="1" ml="4">
                  <LineChart
                    width={120}
                    height={80}
                    data={[
                      { name: "Jan", uv: 400, pv: 2400, amt: 2400 },
                      { name: "Feb", uv: 300, pv: 1398, amt: 2210 },
                      { name: "Mar", uv: 200, pv: 9800, amt: 2290 },
                      { name: "Apr", uv: 278, pv: 3908, amt: 2000 },
                      { name: "May", uv: 189, pv: 4800, amt: 2181 },
                      { name: "Jun", uv: 239, pv: 3800, amt: 2500 },
                      { name: "Jul", uv: 349, pv: 4300, amt: 2100 },
                    ]}
                  >
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Line
                      type="monotone"
                      dataKey="pv"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                  </LineChart>
                </Box>
              </Flex>
            </GridItem>
          ))}
        </Grid>
      );
    };
  
    return (
      <Dashboard>
        <Flex direction="column" alignItems="start" mx="2">
          <Text fontSize="2xl" fontWeight="semibold" mb="4" color="purple.800">
            Contract Documents
          </Text>
          <Divider />
          {getStatusComponent()}
        </Flex>
      </Dashboard>
    );
  }
  
  export default AdminDashboard;
  