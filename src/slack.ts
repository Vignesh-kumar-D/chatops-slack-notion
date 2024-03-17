import type { Handler } from "@netlify/functions";
import { parse } from "querystring";
import { blocks, modal, slackApi, verifySlackRequest } from "./util/slack";
import { saveItems } from "./util/notion";

async function handleInteractivity(payload: SlackModalPayload) {
  const callback_id = payload.callback_id ?? payload.view.callback_id;

  switch (callback_id) {
    case "foodfight-modal":
      const data = payload.view.state.values;
      const field = {
        opinion: data.opinion_block.opinion.value,
        spiceLevel: data.spice_level_block.spice_level.selected_option.value,
        submitter: payload.user.name,
      };
      await saveItems(field);
      await slackApi("chat.postMessage", {
        channel: payload.channel?.id ?? process.env.CHANNEL_GENERAL,
        text: `oh dang, ya,all! :eyes: <@${payload.user.id}> just started a food fight with of a level ${field.spiceLevel}:\n\n*${field.opinion}*\n\n.....let's discuss.`,
      });

      break;
    case "foodfight-nudge":
      const channel = payload.channel?.id;
      const user_id = payload.user.id;
      const thread_ts = payload.message.thread_ts ?? payload.message.ts;

      await slackApi("chat.postMessage", {
        channel,
        thread_ts,
        text: `Hey <@${user_id} looks like you want to start a food fight!!, use command \`/heat-eat\` and type your opinion to get started`,
      });
      break;
    default:
      console.log(`no handler defined for id: ${callback_id}`);
      return {
        statusCode: 400,
        body: `no handler defined for id: ${callback_id}`,
      };
  }
  return {
    statusCode: 200,
    body: "",
  };
}

async function handleSlashCommand(payload: SlackSlashCommandPayload) {
  switch (payload.command) {
    case "/heat-eat":
      const response = await slackApi(
        "views.open",
        modal({
          id: "foodfight-modal",
          title: "start a food fight",
          trigger_id: payload.trigger_id,
          blocks: [
            blocks.section({
              text: "the discourse demands food drama :P. *Send your spiciest food takes so we can all argue about them!*  ",
            }),
            blocks.input({
              id: "opinion",
              label: "Deposit your craziest food opinions here",
              placeholder:
                "Ex: butter paneer with Rice is way better than with naan",
              initial_value: payload.text ?? "",
              hint: "say opiniions which could make the most controversial opinions ever list",
            }),
            blocks.select({
              id: "spice_level",
              label: "How spicy is this opinion",
              placeholder: "Select a spice Level",
              options: [
                {
                  label: "Mild",
                  value: "mild",
                },
                {
                  label: "Medium",
                  value: "medium",
                },
                {
                  label: "Spicy",
                  value: "spicy",
                },
                {
                  label: "Nuclear",
                  value: "nuclear",
                },
              ],
            }),
          ],
        })
      );
      if (!response.ok) {
        console.log(response, "Slack Api Error");
      }
      break;

    default:
      return {
        statusCode: 200,
        body: `command ${payload.command} is not recognized`,
      };
  }

  return {
    statusCode: 200,
    body: "",
  };
}

export const handler: Handler = async (event) => {
  // TODO validate the Slack request
  const isValidRequest = verifySlackRequest(event);

  if (!isValidRequest) {
    console.error("Invalid request received");
    return {
      statusCode: 400,
      body: "Invalid request received",
    };
  }
  const body = parse(event.body ?? "") as SlackPayload;
  // TODO handle slash commands
  if (body.command) {
    return handleSlashCommand(body as SlackSlashCommandPayload);
  }
  // TODO handle interactivity (e.g. context commands, modals)
  if (body.payload) {
    const payload = JSON.parse(body.payload);
    return handleInteractivity(payload);
  }
  return {
    statusCode: 200,
    body: "TODO: handle Slack commands and interactivity",
  };
};
