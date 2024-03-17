// TODO create Notion utilities

export async function notionApi(endpoint: string, body: {}) {
  const res = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${process.env.NOTION_SECRET}`,
      "notion-version": "2022-06-28",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }).catch((err) => {
    console.error(err.message);
  });

  if (!res || !res.ok) {
    console.error(res, ":error from notion");
  }
  return await res?.json();
}

export async function getNewItems(): Promise<NewItem[]> {
  const notionData = await notionApi(
    `/databases/${process.env.NOTION_DATABASE_ID}/query`,
    {
      filter: {
        property: "Status",
        status: {
          equals: "Not started",
        },
      },
      page_size: 100,
    }
  );

  return notionData.results.map((item: NotionItem) => ({
    opinion: item.properties.opinion.title[0].text.content,
    spiceLevel: item.properties.spiceLevel.select.name,
    status: item.properties.Status.status.name,
  }));
}

export async function saveItems(item: NewItem) {
  await notionApi(`/pages`, {
    parent: {
      database_id: process.env.NOTION_DATABASE_ID,
    },
    properties: {
      opinion: {
        title: [{ text: { content: item.opinion } }],
      },

      spiceLevel: {
        select: {
          name: item.spiceLevel,
        },
      },
      submitter: {
        rich_text: [{ text: { content: `@${item.submitter} on slack` } }],
      },
    },
  }).catch((err) => {
    console.error(err.message, ":save failed");
  });
}
