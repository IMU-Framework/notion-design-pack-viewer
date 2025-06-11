import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  const { pageId } = req.query;

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
