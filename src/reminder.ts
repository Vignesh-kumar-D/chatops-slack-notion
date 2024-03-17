import { type Handler, schedule } from "@netlify/functions";
import { getNewItems } from "./util/notion";
import { slackApi, blocks } from "./util/slack";

const postNewNotionItemsToSlack: Handler = async () => {
  const items = await getNewItems();
  await slackApi("chat.postMessage", {
    channel: process.env.CHANNEL_GENERAL,
    blocks: [
      blocks.section({
        text: [
          "Here are the options awaiting judgement:",
          "",
          ...items.map(
            (item) => `- ${item.opinion} (Spice level: ${item.spiceLevel})`
          ),
          "",
          `see all items: <https://notion.com/${process.env.NOTION_DATABASE_ID}| in Notion>`,
        ].join("\n"),
      }),
    ],
  });

  return {
    statusCode: 200,
  };
};
//schedule("* * * * *", postNewNotionItemsToSlack) to test on every minute;
export const handler = schedule("* * * * *", postNewNotionItemsToSlack);
