// 保留原本函式與工具
const pageId = new URLSearchParams(window.location.search).get("pageId");

async function fetchPageData(pageId) {
  const res = await fetch(`/api/page.js?pageId=${pageId}`);
  if (!res.ok) throw new Error("載入失敗");
  return res.json();
}

function renderRichText(richTextArray) {
  return richTextArray.map(rt => {
    let content = rt.plain_text;
    if (rt.annotations.bold) content = `<strong>${content}</strong>`;
    if (rt.annotations.italic) content = `<em>${content}</em>`;
    if (rt.annotations.code) content = `<code class="bg-gray-100 px-1">${content}</code>`;
    if (rt.href) content = `<a href="${rt.href}" class="text-blue-600 underline">${content}</a>`;
    return content;
  }).join('');
}

async function renderBlock(block) {
  const { type } = block;
  const value = block[type];

  switch (type) {
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
      const Tag = type === 'heading_1' ? 'h1' : type === 'heading_2' ? 'h2' : 'h3';
      return `<${Tag} class="font-bold text-${type === 'heading_1' ? '3xl' : type === 'heading_2' ? '2xl' : 'xl'}">${renderRichText(value.rich_text)}</${Tag}>`;

    case 'paragraph':
      return `<p>${renderRichText(value.rich_text)}</p>`;

    case 'toggle':
      const childrenHtml = value.children ? (await renderBlocks(value.children)).join('') : '';
      return `
        <details class="border rounded p-2 bg-gray-50">
          <summary>${renderRichText(value.rich_text)}</summary>
          <div class="ml-4 mt-2 space-y-2">${childrenHtml}</div>
        </details>
      `;

    case 'callout':
      const emoji = value.icon?.emoji || '';
      return `<div class="p-3 border-l-4 bg-blue-50 border-blue-300 rounded"><span class="mr-2">${emoji}</span>${renderRichText(value.rich_text)}</div>`;

    case 'quote':
      return `<blockquote class="border-l-4 pl-4 italic text-gray-600">${renderRichText(value.rich_text)}</blockquote>`;

    case 'code':
      return `<pre class="bg-gray-900 text-white p-4 rounded overflow-x-auto"><code>${value.rich_text[0]?.plain_text || ''}</code></pre>`;

    case 'image':
    case 'file':
      const src = value.file?.url || value.external?.url;
      const filename = src.split("/").pop().split("?")[0];
      return type === 'image'
        ? `<img src="${src}" alt="${filename}" class="max-w-full rounded"/>`
        : `<a href="${src}" target="_blank" class="text-blue-600 underline">${filename}</a>`;

    case 'bulleted_list_item':
    case 'numbered_list_item':
      return {
        type: type,
        html: `<li>${renderRichText(value.rich_text)}</li>`
      };

    default:
      return `<div class="text-sm text-gray-400">[Unsupported block: ${type}]</div>`;
  }
}

// 🔁 處理 block list，包裝成段落或 ul/ol
async function renderBlocks(blocks) {
  const htmlChunks = [];
  let listBuffer = [];
  let currentListType = null;

  for (const block of blocks) {
    if (block.has_children) {
      const res = await fetch(`/api/page.js?pageId=${block.id}`);
      const childData = await res.json();
      block[block.type].children = childData.blocks;
    }

    const rendered = await renderBlock(block);

    // 如果是 list item，我們收集起來
    if (typeof rendered === 'object' && (rendered.type === 'bulleted_list_item' || rendered.type === 'numbered_list_item')) {
      if (!currentListType) currentListType = rendered.type;
      if (rendered.type !== currentListType) {
        htmlChunks.push(wrapList(currentListType, listBuffer));
        listBuffer = [];
        currentListType = rendered.type;
      }
      listBuffer.push(rendered.html);
    } else {
      if (listBuffer.length) {
        htmlChunks.push(wrapList(currentListType, listBuffer));
        listBuffer = [];
        currentListType = null;
      }
      htmlChunks.push(rendered);
    }
  }

  if (listBuffer.length) {
    htmlChunks.push(wrapList(currentListType, listBuffer));
  }

  return htmlChunks;
}

function wrapList(type, items) {
  const tag = type === 'numbered_list_item' ? 'ol' : 'ul';
  return `<${tag} class="list-inside list-${tag === 'ol' ? 'decimal' : 'disc'} pl-6 space-y-1">${items.join('')}</${tag}>`;
}

(async () => {
  const { blocks } = await fetchPageData(pageId);
  const html = await renderBlocks(blocks);
  document.getElementById("notion-content").innerHTML = html.join('');
})();
