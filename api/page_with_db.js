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

async function queryDatabaseRows(databaseId, limit = 5) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: limit,
    });

    // 只回傳文字型資料（title, rich_text）
    return response.results.map((page) => {
      const props = {};
      for (const [key, val] of Object.entries(page.properties)) {
        let text = "-";
        if (val.type === "title" && val.title.length > 0) {
          text = val.title[0].plain_text;
        } else if (val.type === "rich_text" && val.rich_text.length > 0) {
          text = val.rich_text[0].plain_text;
        } else if (val.type === "number") {
          text = val.number?.toString() || "-";
        } else if (val.type === "select") {
          text = val.select?.name || "-";
        } else if (val.type === "checkbox") {
          text = val.checkbox ? "✅" : "❌";
        }
        props[key] = text;
      }
      return props;
    });
  } catch (err) {
    console.warn("⚠️ 無法載入資料庫內容:", databaseId, err.message);
    return [];
  }
}

export default async function handler(req, res) {
  const { pageId } = req.query;

  if (!pageId || pageId === "null") {
    return res.status(400).json({ error: "valid pageId not found" });
  }

  try {
    const blocks = await getBlockChildren(pageId);

    const databaseBlocks = await Promise.all(
      blocks
        .filter((block) => block.type === "child_database")
        .map(async (block) => {
          const dbId = block.id;
          const title = block.child_database.title || "Untitled";
          const rows = await queryDatabaseRows(dbId);
          return {
            id: dbId,
            title,
            type: block.type,
            rows,
          };
        })
    );

    res.status(200).json({
      pageId,
      found: databaseBlocks.length,
      databases: databaseBlocks,
    });
  } catch (error) {
    console.error("❌ API error:", error);
    res.status(500).json({ error: "無法取得資料庫區塊", details: error.message });
  }
}
