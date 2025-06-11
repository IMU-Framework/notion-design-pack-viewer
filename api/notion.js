import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: "Order", direction: "ascending" }],
    });

    const pages = await Promise.all(
      response.results.map(async (page) => {
        const props = page.properties;

        // 處理 Title
        const title = props["Title"]?.title?.[0]?.plain_text || "Untitled";

        // 處理 Parent Item（Relation）
        let parentItem = null;
        const parentRelation = props["Parent Item"]?.relation;
        if (parentRelation && parentRelation.length > 0) {
          const parentId = parentRelation[0]?.id;
          const parentPage = await notion.pages.retrieve({ page_id: parentId });
          parentItem = parentPage.properties?.Title?.title?.[0]?.plain_text || null;
        }

        return {
          Title: title,
          View_Mode: props["View_Mode"]?.select?.name || null,
          Page_ID: props["Page_ID"]?.formula?.string || null,
          Active: props["Active"]?.checkbox || false,
          "Parent item": parentItem,
          Icon: page.icon?.emoji || null,
        };
      })
    );

    res.status(200).json({ pages });
  } catch (error) {
    console.error("❌ Notion API error:", error);
    res.status(500).json({ error: error.message });
  }
}
