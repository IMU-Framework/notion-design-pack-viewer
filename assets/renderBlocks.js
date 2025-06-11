// renderBlocks.js - 輕量化版本
// 放棄複雜的巢狀結構處理，專注於基本功能的穩定實現

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

// 簡化的子區塊獲取函數 - 只獲取直接子區塊，不做遞迴處理
async function fetchChildBlocks(blockId) {
  try {
    const res = await fetch(`/api/page?pageId=${blockId}`);
    const childData = await res.json();
    return childData.blocks || [];
  } catch (error) {
    console.error(`Error fetching children for block ${blockId}:`, error);
    return [];
  }
}

async function renderBlock(block) {
  try {
    const { type } = block;
    const value = block[type];

    // 獲取子區塊（僅第一層）
    if (block.has_children && !value.children && ['toggle', 'callout', 'quote'].includes(type)) {
      value.children = await fetchChildBlocks(block.id);
    }

    switch (type) {
      case 'heading_1':
        return `<h1 class="text-3xl font-bold mb-2">${renderRichText(value.rich_text)}</h1>`;
      
      case 'heading_2':
        return `<h2 class="text-2xl font-bold mb-2">${renderRichText(value.rich_text)}</h2>`;
      
      case 'heading_3':
        return `<h3 class="text-xl font-bold mb-2">${renderRichText(value.rich_text)}</h3>`;

      case 'paragraph':
        return `<p class="mb-4 leading-relaxed">${renderRichText(value.rich_text)}</p>`;

      case 'toggle': {
        let content = `<details class="border rounded p-2 bg-gray-50 mb-4 group"><summary class="cursor-pointer flex items-center">` +
          `<svg class="w-4 h-4 mr-2 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M6 6L14 10L6 14V6Z" /></svg>` +
          `${renderRichText(value.rich_text)}</summary>`;
        
        if (value.children && value.children.length > 0) {
          const childrenHtml = (await renderBlocksInternal(value.children)).join('');
          content += `<div class="ml-4 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">${childrenHtml}</div>`;
        }
        
        content += `</details>`;
        return content;
      }

      case 'callout': {
        const emoji = value.icon?.emoji || '';
        let content = `<div class="p-4 border-l-4 bg-blue-50 border-blue-400 rounded shadow-sm mb-4 flex items-start">` +
          `<div class="mr-2 text-lg">${emoji}</div><div>${renderRichText(value.rich_text)}</div></div>`;
        
        return content;
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

      case 'file': {
        const src = value.file?.url || value.external?.url;
        const filename = src.split("/").pop().split("?")[0];
        return `<div class="mb-4 p-3 border rounded bg-gray-50">
          <a href="${src}" target="_blank" class="flex items-center text-blue-600 underline">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 2a1 1 0 00-.707 1.707L9.586 6H4a1 1 0 100 2h5.586l-2.293 2.293a1 1 0 101.414 1.414l4-4a1 1 0 000-1.414l-4-4A1 1 0 008 2z"></path>
            </svg>
            ${filename}
          </a>
        </div>`;
      }

      case 'bulleted_list_item':
        return { 
          type, 
          html: `<li>${renderRichText(value.rich_text)}</li>` 
        };

      case 'numbered_list_item':
        return { 
          type, 
          html: `<li>${renderRichText(value.rich_text)}</li>` 
        };

      case 'divider':
        return '<hr class="my-6 border-t border-gray-300">';

      case 'table': {
        let tableHtml = '<div class="overflow-x-auto mb-4"><table class="min-w-full border-collapse border border-gray-300">';
        
        if (value.children && value.children.length > 0) {
          // 表格標題行
          if (value.has_column_header) {
            tableHtml += '<thead><tr>';
            for (const cell of value.children[0].table_row.cells) {
              tableHtml += `<th class="border border-gray-300 px-4 py-2 bg-gray-100">${renderRichText(cell)}</th>`;
            }
            tableHtml += '</tr></thead>';
          }
          
          // 表格內容
          tableHtml += '<tbody>';
          const startRow = value.has_column_header ? 1 : 0;
          for (let i = startRow; i < value.children.length; i++) {
            tableHtml += '<tr>';
            for (const cell of value.children[i].table_row.cells) {
              tableHtml += `<td class="border border-gray-300 px-4 py-2">${renderRichText(cell)}</td>`;
            }
            tableHtml += '</tr>';
          }
          tableHtml += '</tbody>';
        }
        
        tableHtml += '</table></div>';
        return tableHtml;
      }

      case 'to_do': {
        const checked = value.checked ? 'checked' : '';
        return `
          <div class="flex items-start mb-2">
            <input type="checkbox" ${checked} class="mt-1 mr-2" disabled>
            <div class="${value.checked ? 'line-through text-gray-500' : ''}">${renderRichText(value.rich_text)}</div>
          </div>
        `;
      }

      case 'bookmark': {
        return `<div class="border rounded p-3 bg-gray-50 mb-4">
          <a href="${value.url}" target="_blank" class="text-blue-600 flex items-center">
            <span class="mr-2">🔖</span>
            <span>${value.url}</span>
          </a>
          ${value.caption?.length ? `<div class="text-sm text-gray-500 mt-1">${renderRichText(value.caption)}</div>` : ''}
        </div>`;
      }

      case 'equation': {
        return `<div class="py-2 px-4 bg-gray-50 overflow-x-auto mb-4">
          <span class="font-mono">${value.expression}</span>
        </div>`;
      }

      case 'video': {
        const videoUrl = value.file?.url || value.external?.url;
        if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
          const videoId = videoUrl.includes('youtube.com') 
            ? videoUrl.split('v=')[1]?.split('&')[0] 
            : videoUrl.split('youtu.be/')[1];
          return `<div class="mb-4">
            <iframe src="https://www.youtube.com/embed/${videoId}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
              class="w-full h-64">
            </iframe>
          </div>`;
        } else {
          return `<video controls class="w-full mb-4">
            <source src="${videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
          </video>`;
        }
      }

      case 'embed': {
        return `<div class="border rounded p-2 mb-4">
          <iframe src="${value.url}" class="w-full h-96" frameborder="0"></iframe>
        </div>`;
      }

      default:
        return `<div class="text-sm text-gray-400 mb-2">[Unsupported block: ${type}]</div>`;
    }
  } catch (error) {
    console.error(`Error rendering block:`, error);
    return `<div class="p-2 border border-red-300 bg-red-50 text-red-700 rounded mb-4">
      Error rendering block: ${block?.type || 'unknown'}
    </div>`;
  }
}

async function renderBlocksInternal(blocks) {
  if (!blocks || blocks.length === 0) return [];
  
  const htmlChunks = [];
  let listBuffer = [];
  let currentListType = null;

  for (const block of blocks) {
    try {
      const rendered = await renderBlock(block);

      // 如果是列表項目，收集起來
      if (typeof rendered === 'object' && (rendered.type === 'bulleted_list_item' || rendered.type === 'numbered_list_item')) {
        if (!currentListType) currentListType = rendered.type;
        
        // 如果列表類型變了，先處理之前的列表
        if (rendered.type !== currentListType) {
          htmlChunks.push(wrapList(currentListType, listBuffer));
          listBuffer = [];
          currentListType = rendered.type;
        }
        
        listBuffer.push(rendered.html);
      } else {
        // 如果有未處理的列表，先處理它
        if (listBuffer.length) {
          htmlChunks.push(wrapList(currentListType, listBuffer));
          listBuffer = [];
          currentListType = null;
        }
        
        htmlChunks.push(rendered);
      }
    } catch (error) {
      console.error("Error processing block:", error);
      htmlChunks.push(`<div class="p-2 border border-red-300 bg-red-50 text-red-700 rounded mb-4">
        Error processing block
      </div>`);
    }
  }

  // 處理最後剩餘的列表項
  if (listBuffer.length) {
    htmlChunks.push(wrapList(currentListType, listBuffer));
  }

  return htmlChunks;
}

function wrapList(type, items) {
  const tag = type === 'numbered_list_item' ? 'ol' : 'ul';
  const listClass = tag === 'ol' ? 'list-decimal' : 'list-disc';
  return `<${tag} class="pl-6 space-y-1 mb-4 ${listClass}">${items.join('')}</${tag}>`;
}
