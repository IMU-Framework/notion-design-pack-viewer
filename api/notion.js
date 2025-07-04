import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  try {
    // 獲取資料庫資訊以取得標題
    const dbInfo = await notion.databases.retrieve({
      database_id: databaseId
    });
    
    // 從資料庫屬性中提取標題及描述
    const databaseTitle = dbInfo.title.map(t => t.plain_text).join('') || 'OPMS';
    const databaseDescription = dbInfo.description?.map(d => d.plain_text).join('') || 'description';

    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: "Order", direction: "ascending" }],
    });

    const pages = await Promise.all(
      response.results.map(async (page) => {
        const props = page.properties;
        const title = props["Title"]?.title?.[0]?.plain_text || "Untitled";
        const rawViewMode = props["View_Mode"]?.select?.name?.toLowerCase() || null;
        const viewMode = ['db', 'page'].includes(rawViewMode) ? rawViewMode : 'page';
        const pageId = props["Page_ID"]?.formula?.string || null;
        const active = props["Active"]?.checkbox || false;

        // ✅ 支援 Emoji / External / File icon
        let icon = null;
        if (page.icon) {
          if (page.icon.type === "emoji") {
            icon = page.icon.emoji;
          } else if (page.icon.type === "external") {
            icon = page.icon.external.url;
          } else if (page.icon.type === "file") {
            icon = page.icon.file.url;
          }
        }

        // 處理 Group（Relation -> Title）
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

        return {
          Title: title,
          View_Mode: viewMode,
          Page_ID: pageId,
          Active: active,
          Group: group,
          Icon: icon,
          Order: props["Order"]?.number ?? null,
          CreatedTime: page.created_time,
        };
      })
    );

    res.status(200).json({ pages, databaseTitle, databaseDescription});
  } catch (error) {
    console.error("❌ Notion API error:", error);
    res.status(500).json({ error: error.message });
  }
}
