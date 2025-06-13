import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ✅ 記憶體快取區：key = pageId, value = { blocks, timestamp }
const pageCache = new Map();
const cacheTTL = 5 * 60 * 1000; // 快取有效 5 分鐘

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

  // 遞迴抓取子層（僅對 has_children 的 block 做遞迴）
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
  const { pageId } = req.query;

  if (!pageId) {
    return res.status(400).json({ error: "Missing pageId" });
  }

  // ✅ 嘗試讀取快取
  const cached = pageCache.get(pageId);
  if (cached && Date.now() - cached.timestamp < cacheTTL) {
    return res.status(200).json({ blocks: cached.blocks, fromCache: true });
  }

  try {
    const blocks = await getBlockChildren(pageId);
    pageCache.set(pageId, { blocks, timestamp: Date.now() }); // 更新快取
    res.status(200).json({ blocks });
  } catch (err) {
    console.error("❌ Notion API error in /api/page.js:", err.message);
    res.status(500).json({ error: "Failed to fetch Notion blocks" });
  }
}
