import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

// 工具函數：將 Order 欄位轉為數字或保留文字
function parseOrderValue(val) {
  if (!val || typeof val !== 'string' || val.trim() === '') return null;
  const trimmed = val.trim();
  const num = parseFloat(trimmed);
  return isNaN(num) ? trimmed : num;
}

export default async function handler(req, res) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [], // 排序交由前端處理
    });

    const pages = await Promise.all(
      response.results.map(async (page) => {
        const props = page.properties;
        const title = props["Title"]?.title?.[0]?.plain_text || "Untitled";
        const viewMode = props["View_Mode"]?.select?.name || null;
        const pageId = props["Page_ID"]?.formula?.string || null;
        const active = props["Active"]?.checkbox || false;
        const icon = page.icon?.emoji || null;

        // 取得 Group（Relation -> Title）
        let group = null;
        const groupRel = props["Group"]?.relation;
        if (groupRel && groupRel.length > 0) {
          const parentId = groupRel[0].id;
          try {
            const parentPage = await notion.pages.retrieve({ page_id: parentId });
            group = parentPage.properties?.Title?.title?.[0]?.plain_text || null;
          } catch (err) {
            console.warn("無法擷取 Group 關聯頁面 Title", parentId);
          }
        }

        // ⬇️ Order 欄位內容從 Rich Text 或 Text 類型解析
        const orderRaw = props["Order"];
        let orderText = null;
        if (orderRaw?.type === 'rich_text') {
          orderText = orderRaw.rich_text?.[0]?.plain_text || null;
        } else if (orderRaw?.type === 'text') {
          orderText = orderRaw.text?.[0]?.plain_text || null;
        }

        const parsedOrder = parseOrderValue(orderText);

        return {
          Title: title,
          View_Mode: viewMode,
          Page_ID: pageId,
          Active: active,
          Group: group,
          Icon: icon,
          Order: parsedOrder,
          CreatedTime: page.created_time,
        };
      })
    );

    res.status(200).json({ pages });
  } catch (error) {
    console.error("❌ Notion API error:", error);
    res.status(500).json({ error: error.message });
  }
}
