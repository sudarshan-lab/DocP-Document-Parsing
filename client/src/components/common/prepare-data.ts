import {
    AnnouncementDataType,
    AnnouncementsStats,
    ContractDataType,
    FaqDataType,
  } from "./data-types";
  import dayjs from "dayjs";
  import { timeDifference } from "./utils";
  export const prepareAnnouncements = (data: any) => {
    const toReturn: ContractDataType[] = data?.map((contract: any) => {
      return {
        key: contract?._id,
        name: contract?.name,
        description: contract?.description,
        prompt: contract?.prompt,
        addedDate: dayjs(contract?.addedDate).format("MM-DD-YYYY hh:MMa"),
        modifiedDate: dayjs(contract?.modifiedDate).format("MM-DD-YYYY hh:MMa"),
      };
    });
    return toReturn;
  };
  
  export const prepareFaqs = (data: any) => {
    const toReturn: FaqDataType[] = data?.map((faq: any) => {
      return {
        key: faq?._id,
        title: faq?.title,
        description: faq?.description,
        isHidden: faq?.isHidden,
        faqNumber: faq?.faqNumber,
        files: faq?.files,
        createdAt: dayjs(faq?.createdAt).format("MM-DD-YYYY - hh:MM A"),
        assignee: faq?.assignee,
      };
    });
    return toReturn;
  };
  
  export const prepareAnnouncementsStats = (data: any) => {
    const toReturn: AnnouncementsStats = data?.reduce(
      (accumulator: any, currentValue: any) => {
        if (currentValue.status === "Running") {
          accumulator.running += 1;
        } else if (currentValue.status === "Upcoming") {
          accumulator.upcoming += 1;
        } else if (currentValue.status === "Published") {
          accumulator.published += 1;
        }
        accumulator.total += 1;
        return accumulator;
      },
      { total: 0, running: 0, published: 0, upcoming: 0 }
    );
    return toReturn;
  };
  