// /api/notion.js
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  const databaseId = process.env.NOTION_DATABASE_ID;

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: 'Order',
          direction: 'ascending'
        }
      ]
    });

    const pages = response.results.map(page => {
      const props = page.properties;
      return {
        Title: props.Title?.title?.[0]?.plain_text || '',
        Order: props.Order?.number ?? null,
        Active: props.Active?.checkbox ?? false,
        View_Mode: props.View_Mode?.select?.name || null,
        Page_ID: page.id.replace(/-/g, ''),
        Icon: page.icon?.emoji || null,
      };
    });

    res.status(200).json({ pages });
  } catch (error) {
    console.error('❌ Notion API error:', error);
    res.status(500).json({ error: 'Notion API error' });
  }
}
