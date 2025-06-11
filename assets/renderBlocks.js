// 新版 renderBlocks.js
// 整體優化：樣式、互動、支援度更接近 Notion 呈現

window.renderBlocks = async function(blocks) {
  return await renderBlocksInternal(blocks);
};

function renderRichText(richTextArray) {
  if (!richTextArray || richTextArray.length === 0) return '';
  return richTextArray.map(rt => {
    let content = rt.plain_text;
    let styles = '';
    if (rt.annotations.color && rt.annotations.color !== 'default') {
      const colorMap = {
        'gray': 'text-gray-500', 'brown': 'text-amber-800', 'orange': 'text-orange-500', 'yellow': 'text-yellow-500',
        'green': 'text-green-500', 'blue': 'text-blue-500', 'purple': 'text-purple-500', 'pink': 'text-pink-500', 'red': 'text-red-500',
        'gray_background': 'bg-gray-200', 'brown_background': 'bg-amber-200', 'orange_background': 'bg-orange-200', 'yellow_background': 'bg-yellow-200',
        'green_background': 'bg-green-200', 'blue_background': 'bg-blue-200', 'purple_background': 'bg-purple-200', 'pink_background': 'bg-pink-200', 'red_background': 'bg-red-200',
      };
      styles += ` ${colorMap[rt.annotations.color] || ''}`;
    }
    if (rt.annotations.bold) content = `<strong>${content}</strong>`;
    if (rt.annotations.italic) content = `<em>${content}</em>`;
    if (rt.annotations.strikethrough) content = `<s>${content}</s>`;
    if (rt.annotations.underline) content = `<u>${content}</u>`;
    if (rt.annotations.code) content = `<code class="bg-gray-100 px-1 rounded">${content}</code>`;
    if (rt.href) content = `<a href="${rt.href}" class="text-blue-600 underline" target="_blank">${content}</a>`;
    if (styles.trim()) content = `<span class="${styles.trim()}">${content}</span>`;
    return content;
  }).join('');
}

async function renderBlock(block) {
  const { type } = block;
  const value = block[type];
  let childrenHtml = '';
  if (block.has_children && !value.children) {
    try {
      const res = await fetch(`/api/page?pageId=${block.id}`);
      const childData = await res.json();
      value.children = childData.blocks;
    } catch {
      value.children = [];
    }
  }
  if (value.children?.length) {
    childrenHtml = (await renderBlocksInternal(value.children)).join('');
  }

  switch (type) {
    case 'heading_1':
    case 'heading_2':
    case 'heading_3': {
      const Tag = type === 'heading_1' ? 'h1' : type === 'heading_2' ? 'h2' : 'h3';
      const size = type === 'heading_1' ? 'text-3xl' : type === 'heading_2' ? 'text-2xl' : 'text-xl';
      if (block.has_children) {
        return `<details class="group mb-4"><summary class="cursor-pointer list-none font-bold ${size} flex items-center">` +
          `<svg class="w-4 h-4 mr-2 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M6 6L14 10L6 14V6Z" /></svg>` +
          `${renderRichText(value.rich_text)}</summary><div class="pl-6 mt-2 space-y-2 border-l-2 border-gray-200">${childrenHtml}</div></details>`;
      }
      return `<${Tag} class="${size} font-bold mb-2">${renderRichText(value.rich_text)}</${Tag}>`;
    }

    case 'paragraph':
      return `<p class="mb-4 leading-relaxed">${renderRichText(value.rich_text)}</p>`;

    case 'toggle':
      return `<details class="border rounded p-2 bg-gray-50 mb-4 group"><summary class="cursor-pointer flex items-center">` +
        `<svg class="w-4 h-4 mr-2 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M6 6L14 10L6 14V6Z" /></svg>` +
        `${renderRichText(value.rich_text)}</summary><div class="ml-4 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">${childrenHtml}</div></details>`;

    case 'callout': {
      const emoji = value.icon?.emoji || '';
      return `<div class="p-4 border-l-4 bg-blue-50 border-blue-400 rounded shadow-sm mb-4 flex items-start">` +
        `<div class="mr-2 text-lg">${emoji}</div><div>${renderRichText(value.rich_text)}</div></div>`;
    }

    case 'quote':
      return `<blockquote class="border-l-4 pl-4 italic text-gray-600 mb-4">${renderRichText(value.rich_text)}</blockquote>`;

    case 'code': {
      const lang = value.language || 'plain';
      const text = value.rich_text.map(rt => rt.plain_text).join('\n');
      return `<div class="mb-4"><div class="bg-gray-800 text-gray-200 px-4 py-1 text-sm rounded-t">${lang}</div>` +
        `<pre class="bg-gray-900 text-white p-4 rounded-b overflow-x-auto"><code>${text}</code></pre></div>`;
    }

    case 'image': {
      const src = value.file?.url || value.external?.url;
      const caption = value.caption?.length ? `<figcaption class="text-center text-gray-500 mt-1">${renderRichText(value.caption)}</figcaption>` : '';
      return `<figure class="mb-4"><img src="${src}" alt="image" class="max-w-full rounded mx-auto"/>${caption}</figure>`;
    }

    case 'divider':
      return '<hr class="my-6 border-t border-gray-300">';

    default:
      return `<div class="text-sm text-gray-400 mb-2">[Unsupported block: ${type}]</div>`;
  }
}

async function renderBlocksInternal(blocks) {
  const htmlChunks = [];
  let listBuffer = [];
  let currentListType = null;
  for (const block of blocks) {
    const rendered = await renderBlock(block);
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
  if (listBuffer.length) htmlChunks.push(wrapList(currentListType, listBuffer));
  return htmlChunks;
}

function wrapList(type, items) {
  const tag = type === 'numbered_list_item' ? 'ol' : 'ul';
  const listClass = tag === 'ol' ? 'list-decimal' : 'list-disc';
  return `<${tag} class="pl-6 space-y-1 mb-4 ${listClass}">${items.join('')}</${tag}>`;
}
