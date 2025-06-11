const pageId = new URLSearchParams(window.location.search).get("pageId");

async function fetchPageData(pageId) {
  const res = await fetch(`/api/notion/page.js?pageId=${pageId}`);
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

    case 'bulleted_list_item':
    case 'numbered_list_item':
      return `<li>${renderRichText(value.rich_text)}</li>`;

    case 'toggle':
      const childrenHtml = value.children ? (await renderBlocks(value.children)).join('') : '';
      return `
        <details class="border rounded p-2 bg-gray-50">
          <summary>${renderRichText(value.rich_text)}</summary>
          <div class="ml-4 mt-2">${childrenHtml}</div>
        </details>
      `;

    case 'callout':
      const emoji = value.icon?.emoji || '';
      return `<div class="p-3 border-l-4 bg-blue-50 border-blue-300 rounded"><span>${emoji}</span> ${renderRichText(value.rich_text)}</div>`;

    case 'quote':
      return `<blockquote class="border-l-4 pl-4 italic text-gray-600">${renderRichText(value.rich_text)}</blockquote>`;

    case 'code':
      return `<pre class="bg-gray-900 text-white p-4 rounded overflow-x-auto"><code>${value.rich_text[0]?.plain_text || ''}</code></pre>`;

    case 'image':
    case 'file':
      const src = block[type].file?.url || block[type].external?.url;
      const filename = src.split("/").pop().split("?")[0];
      return type === 'image'
        ? `<img src="${src}" alt="${filename}" class="max-w-full rounded"/>`
        : `<a href="${src}" target="_blank" class="text-blue-600 underline">${filename}</a>`;

    default:
      return `<div class="text-sm text-gray-400">[Unsupported block: ${type}]</div>`;
  }
}

async function renderBlocks(blocks) {
  const htmlArray = await Promise.all(blocks.map(renderBlock));
  return htmlArray;
}

(async () => {
  const { blocks } = await fetchPageData(pageId);

  // 處理嵌套 children
  for (const block of blocks) {
    if (block.has_children) {
      const res = await fetch(`/api/notion/page.js?pageId=${block.id}`);
      const childData = await res.json();
      block[block.type].children = childData.blocks;
    }
  }

  const html = await renderBlocks(blocks);
  document.getElementById("notion-content").innerHTML = html.join('');
})();
