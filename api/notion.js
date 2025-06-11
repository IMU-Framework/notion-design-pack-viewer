import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [], // Order 將於前端處理
    });

    // 先整理全部頁面
    let rawPages = await Promise.all(
      response.results.map(async (page) => {
        const props = page.properties;
        const pageDetails = await notion.pages.retrieve({ page_id: page.id });

        const title = props["Title"]?.title?.[0]?.plain_text || "Untitled";
        const viewMode = props["View_Mode"]?.select?.name || null;
        const pageId = props["Page_ID"]?.formula?.string || null;
        const active = props["Active"]?.checkbox || false;
        const icon = pageDetails.icon?.emoji || null;
        const order = props["Order"]?.number ?? null;
        const created = page.created_time;

        // 處理 Group（Relation → Title）
        let group = null;
        const groupRel = props["Group"]?.relation;
        if (groupRel && groupRel.length > 0) {
          const parentId = groupRel[0].id;
          try {
            const parentPage = await notion.pages.retrieve({ page_id: parentId });
            group = parentPage.properties?.Title?.title?.[0]?.plain_text || null;
          } catch (err) {
            console.warn("❗無法擷取 Group 關聯頁面 Title", parentId);
          }
        }

        return {
          Title: title,
          View_Mode: viewMode,
          Page_ID: pageId,
          Active: active,
          Icon: icon,
          Group: group,
          Order: order,
          CreatedTime: created,
        };
      })
    );

    // 去除同名 Home，僅保留 CreatedTime 最早者
    const homePages = rawPages.filter(p => p.Title === 'Home');
    let selectedHome = null;
    if (homePages.length > 0) {
      selectedHome = homePages.reduce((a, b) => new Date(a.CreatedTime) < new Date(b.CreatedTime) ? a : b);
    }

    // 過濾其餘頁面（去除多餘的 Home）
    const filteredPages = rawPages.filter(p => p.Title !== 'Home');
    if (selectedHome) filteredPages.push(selectedHome);

    res.status(200).json({ pages: filteredPages });
  } catch (error) {
    console.error("❌ Notion API error:", error);
    res.status(500).json({ error: error.message });
  }
}
