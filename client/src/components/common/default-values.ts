import dayjs from "dayjs";

export interface appDefaultValues {
  ANNOUNCEMENT: {
    title: "";
    description: "";
    assignee: "all";
    startTime: "now";
    endTime: "now";
  };
}

export const getDefaultContract = () => {
  return {
    id: "",
    name: "",
    prompt: "",
    description: "",
  };
};

export const getDefaultFaq = () => {
  return {
    title: "",
    description: "",
    assignee: "all",
  };
};
