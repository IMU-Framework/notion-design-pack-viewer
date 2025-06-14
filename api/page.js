import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const pageCache = new Map();
const cacheTTL = 60 * 60 * 1000; // 1小時

// 遞迴抓取所有 blocks（含 children）
async function getBlockChildren(blockId, depth = 0, maxDepth = 3) {
  const blocks = [];
  let cursor;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 50,
    });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  if (depth < maxDepth) {
    for (const block of blocks) {
      if (block.has_children) {
        const childBlocks = await getBlockChildren(block.id, depth + 1, maxDepth);
        if (block[block.type]) {
          block[block.type].children = childBlocks;
        }
      }
    }
  }

  return blocks;
}

export default async function handler(req, res) {
  const { pageId, forceRefresh } = req.query;

  if (!pageId) {
    return res.status(400).json({ error: "Missing pageId" });
  }

  // 強制刷新或從快取讀取
  const cached = pageCache.get(pageId);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < cacheTTL) {
    return res.status(200).json({ blocks: cached.blocks, fromCache: true });
  }

  try {
    const blocks = await getBlockChildren(pageId);
    pageCache.set(pageId, { blocks, timestamp: Date.now() });
    res.status(200).json({ blocks });
  } catch (err) {
    console.error("❌ Notion API error in /api/page.js:", err.message);
    res.status(500).json({ error: "Failed to fetch Notion blocks" });
  }
}
