import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ✅ 記憶體快取區
const dbCache = new Map();
const cacheTTL = 30 * 60 * 1000; // 30分鐘快取

export default async function handler(req, res) {
  const { pageId } = req.query;

  if (!pageId) {
    return res.status(400).json({ error: "Missing pageId" });
  }

  // 檢查記憶體快取
  const cached = dbCache.get(pageId);
  if (cached && Date.now() - cached.timestamp < cacheTTL) {
    return res.status(200).json({ databases: cached.data, fromCache: true });
  }

  try {
    const blocks = [];
    let cursor;

    // 取得該 pageId 的所有 blocks
    do {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 50,
      });
      blocks.push(...response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // 篩選出 child_database 類型的 block
    const databases = blocks
      .filter(block => block.type === "child_database")
      .map(block => ({
        id: block.id,
        title: block.child_database.title,
        icon: block.icon?.emoji || block.icon?.external?.url || null
      }));

    // 寫入快取
    dbCache.set(pageId, { data: databases, timestamp: Date.now() });

    res.status(200).json({ databases });
  } catch (error) {
    console.error("❌ Notion API error in /api/page_with_db.js:", error.message);
    res.status(500).json({ error: "Failed to fetch child databases" });
  }
}
