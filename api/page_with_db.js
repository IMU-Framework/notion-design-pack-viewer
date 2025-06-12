// /api/page_with_db.js
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function getBlockChildren(blockId) {
  const blocks = [];
  let cursor = undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 50,
    });

    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  return blocks;
}

export default async function handler(req, res) {
  const { pageId } = req.query;

  if (!pageId || pageId === "null") {
    return res.status(400).json({ error: "缺少有效 pageId" });
  }

  try {
    const blocks = await getBlockChildren(pageId);

    // 過濾出資料庫相關 blocks
    const databaseBlocks = blocks.filter(
      (block) => block.type === "child_database"
    ).map((block) => ({
      id: block.id,
      title: block.child_database.title,
      type: block.type,
    }));

    res.status(200).json({
      pageId,
      found: databaseBlocks.length,
      databases: databaseBlocks,
    });
  } catch (error) {
    console.error("❌ Error loading page DB blocks:", error);
    res.status(500).json({ error: "無法取得資料庫區塊", details: error.message });
  }
}
