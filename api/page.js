import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ✅ 記憶體快取區
const pageCache = new Map();
const cacheTTL = 5 * 60 * 1000; // 5分鐘快取

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

  // 遞迴抓取子層（僅對 has_children 的 block 做遞迴，以及判斷是否為synced_block）
  if (depth < maxDepth) {
    for (const block of blocks) {
      if (block.has_children || block.type === 'synced_block') {
        let childBlocks = [];

        // 如果是 synced_block 且來自別的 block，改抓 synced_from 的 block
        if (block.type === 'synced_block' && block.synced_block?.synced_from?.block_id) {
          childBlocks = await getBlockChildren(block.synced_block.synced_from.block_id, depth + 1, maxDepth);
        } else {
          childBlocks = await getBlockChildren(block.id, depth + 1, maxDepth);
        }

        if (block[block.type]) {
          block[block.type].children = childBlocks;
        }
      }
    }
  }

  return blocks;
}

export default async function handler(req, res) {
  const { pageId, clear } = req.query;

  if (!pageId) {
    return res.status(400).json({ error: "Missing pageId" });
  }

  // ✅ 若指定清除 cache
  if (clear === "true") {
    pageCache.delete(pageId);
    console.log("🧹 Cache cleared for", pageId);
    return res.status(200).json({ cleared: true });
  }

  // ✅ 嘗試讀取快取
  const cached = pageCache.get(pageId);
  if (cached && Date.now() - cached.timestamp < cacheTTL) {
    return res.status(200).json({ blocks: cached.blocks, fromCache: true });
  }

  try {
    const pageMeta = await notion.pages.retrieve({ page_id: pageId });
    const lastEdited = pageMeta.last_edited_time;

    // 加這兩個
    const title = pageMeta.properties?.Title?.title?.[0]?.plain_text || '未命名頁面';
    let group = null;
    try {
      const groupRel = pageMeta.properties?.Group?.relation;
      if (groupRel?.length > 0) {
        const parentPage = await notion.pages.retrieve({ page_id: groupRel[0].id });
        group = parentPage.properties?.Title?.title?.[0]?.plain_text || null;
      }
    } catch (e) {
      console.warn("Group 讀取失敗", e);
    }

    const blocks = await getBlockChildren(pageId);
    pageCache.set(pageId, { blocks, lastEdited, timestamp: Date.now() }); // 更新快取

    res.status(200).json({ blocks, lastEdited, title, group });
  } catch (err) {
    console.error("❌ Notion API error in /api/page.js:", err.message);
    res.status(500).json({ error: "Failed to fetch Notion blocks" });
  }

}
