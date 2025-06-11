import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  const { pageId } = req.query;

  if (!pageId) {
    return res.status(400).json({ error: "Missing pageId" });
  }

  try {
    const blocks = [];
    let cursor;

    // 分頁抓取所有 block
    do {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 50,
      });

      blocks.push(...response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    res.status(200).json({ blocks });
  } catch (err) {
    console.error("❌ Notion API error in /api/page.js:", err.message);
    res.status(500).json({ error: "Failed to fetch Notion blocks" });
  }
}
