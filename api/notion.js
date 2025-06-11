import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: "Order", direction: "ascending" }],
    });

    const pages = response.results.map((page) => {
      const props = page.properties;

      const title = props["Title"]?.title?.[0]?.plain_text || "Untitled";
      const viewMode = props["View_Mode"]?.select?.name || null;
      const pageId = props["Page_ID"]?.formula?.string || null;
      const active = props["Active"]?.checkbox || false;
      const icon = page.icon?.emoji || null;
      const group = props["Group"]?.select?.plain_text || null;

      return {
        Title: title,
        View_Mode: viewMode,
        Page_ID: pageId,
        Active: active,
        Group: group,
        Icon: icon,
      };
    });

    res.status(200).json({ pages });
  } catch (error) {
    console.error("❌ Notion API error:", error);
    res.status(500).json({ error: error.message });
  }
}
