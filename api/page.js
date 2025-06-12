import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// 獲取區塊及其子區塊
async function getBlockWithChildren(blockId, depth = 1) {
  try {
    // 獲取區塊
    const block = await notion.blocks.retrieve({ block_id: blockId });
    
    // 如果區塊有子項且需要獲取子項
    if (block.has_children && depth > 0) {
      const children = await getBlockChildren(blockId, depth - 1);
      
      // 將子項放在適當的位置
      if (['table', 'column_list', 'toggle', 'callout', 'quote', 'paragraph', 
           'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 
           'numbered_list_item', 'to_do'].includes(block.type)) {
        // 對於這些特定類型，將子項放在類型對應的屬性中
        block[block.type].children = children;
      } else {
        // 對於其他類型，統一放在 children 屬性中
        block.children = children;
      }
    }
    
    return block;
  } catch (error) {
    console.error(`Error retrieving block ${blockId}:`, error);
    throw error;
  }
}

// 獲取區塊的所有子項
async function getBlockChildren(blockId, depth = 1) {
  const children = [];
  let cursor;
  
  try {
    // 分頁獲取所有子區塊
    do {
      const response = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 50,
      });
      
      const blocks = response.results;
      
      // 如果需要繼續獲取子區塊的子區塊
      if (depth > 0) {
        for (const block of blocks) {
          if (block.has_children) {
            // 遞迴獲取子區塊
            const childBlocks = await getBlockChildren(block.id, depth - 1);
            
            // 將子項放在適當的位置
            if (['table', 'column_list', 'toggle', 'callout', 'quote', 'paragraph',
                 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 
                 'numbered_list_item', 'to_do', 'table_of_contents', 'equation'].includes(block.type)) {
              // 對於這些特定類型，將子項放在類型對應的屬性中
              block[block.type].children = childBlocks;
            } else {
              // 對於其他類型，統一放在 children 屬性中
              block.children = childBlocks;
            }
          }
        }
      }
      
      children.push(...blocks);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    
    return children;
  } catch (error) {
    console.error(`Error retrieving children for block ${blockId}:`, error);
    throw error;
  }
}

export default async function handler(req, res) {
  const { pageId } = req.query;
  const { depth = 2 } = req.query; // 默認獲取 2 層子區塊，確保能獲取列表的巢狀結構
  const maxDepth = Math.min(parseInt(depth) || 2, 3); // 限制最大深度為 3，避免請求過多

  if (!pageId || pageId === "null" || pageId === "undefined") {
    return res.status(400).json({ error: "無效的 Page ID", details: `提供的 pageId: ${pageId}` });
  }

  try {
    // 嘗試先獲取頁面資訊以驗證 pageId 是否有效
    try {
      await notion.pages.retrieve({ page_id: pageId });
    } catch (error) {
      if (error.code === 'object_not_found') {
        return res.status(404).json({ error: "找不到頁面", details: `Page ID ${pageId} 不存在` });
      }
      throw error; // 其他錯誤繼續拋出
    }

    // 獲取頁面的所有區塊，包括子區塊
    const blocks = await getBlockChildren(pageId, maxDepth);

    // 添加一個標誌，表示這是包含子區塊的回應
    res.status(200).json({ 
      blocks,
      includesChildren: true,
      maxDepth
    });
  } catch (error) {
    console.error(`❌ Notion API error for pageId ${pageId}:`, error);
    
    // 根據錯誤類型返回適當的狀態碼和訊息
    const status = error.status || 500;
    const message = error.message || "伺服器內部錯誤";
    
    res.status(status).json({ 
      error: message,
      code: error.code,
      details: `處理 pageId ${pageId} 時發生錯誤`
    });
  }
}
