// renderBlocks.js

function renderErrorBlock(type, errorMessage = '') {
  return `<div class="p-2 border border-red-300 bg-red-50 text-red-700 rounded mb-4">
    [Error rendering block: ${type}] ${errorMessage}
  </div>`;
}

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
    if (rt.annotations.code) content = `<code class="bg-blue-100 text-blue-600 px-1 py-1 rounded">${content}</code>`;
    if (rt.href) content = `<a href="${rt.href}" class="text-blue-600 underline" target="_blank">${content}</a>`;
    if (styles.trim()) content = `<span class="${styles.trim()}">${content}</span>`;
    return content;
  }).join('');
}

// 渲染 callout 圖標
function renderCalloutIcon(icon) {
  if (!icon) return '';
  
  if (icon.emoji) {
    return `<div class="mr-2 text-lg">${icon.emoji}</div>`;
  }
  
  if (icon.type === 'file' && icon.file?.url) {
    return `<img src="${icon.file.url}" class="w-5 h-5 mr-2" alt="icon" />`;
  }
  
  if (icon.type === 'external' && icon.external?.url) {
    return `<img src="${icon.external.url}" class="w-5 h-5 mr-2" alt="icon" />`;
  }
  
  return '';
}

// 追踪列表的嵌套層級
let bulletedListLevel = 0;
let numberedListLevel = 0;

window.renderBlocks = async function(blocks) {
  const result = await renderBlocksInternal(blocks);
  return result;
};

// 標題配置 - 集中管理標題樣式
const headingConfig = {
  'heading_1': { 
    textClass: 'text-4xl', 
    marginTop: 'mt-12', 
    marginBottom: 'mb-4' 
  },
  'heading_2': { 
    textClass: 'text-3xl', 
    marginTop: 'mt-9', 
    marginBottom: 'mb-3' 
  },
  'heading_3': { 
    textClass: 'text-xl', 
    marginTop: 'mt-7', 
    marginBottom: 'mb-2' 
  }
};

// 顏色配置 - 集中管理顏色樣式
const colorMap = {
  'gray': { bg: 'bg-gray-50', border: 'border-gray-400' },
  'brown': { bg: 'bg-amber-50', border: 'border-amber-400' },
  'orange': { bg: 'bg-orange-50', border: 'border-orange-400' },
  'yellow': { bg: 'bg-yellow-50', border: 'border-yellow-400' },
  'green': { bg: 'bg-green-50', border: 'border-green-400' },
  'blue': { bg: 'bg-blue-50', border: 'border-blue-400' },
  'purple': { bg: 'bg-purple-50', border: 'border-purple-400' },
  'pink': { bg: 'bg-pink-50', border: 'border-pink-400' },
  'red': { bg: 'bg-red-50', border: 'border-red-400' },
};

// 渲染標題函數 - 整合標題渲染邏輯
async function renderHeading(block, headingType) {
  const { type } = block;
  const value = block[type];
  const config = headingConfig[headingType];
  
  // 如果沒有配置，返回錯誤
  if (!config) return renderErrorBlock(headingType, 'Missing heading configuration');
  
  // 標準標題
  let content = `<h${headingType.slice(-1)} class="${config.textClass} font-bold ${config.marginBottom} ${config.marginTop}" id="heading-${block.id}">
    ${renderRichText(value.rich_text)}
  </h${headingType.slice(-1)}>`;
  
  // 可折疊標題
  if (value.is_toggleable && value.children && value.children.length > 0) {
    const childrenHtml = (await renderBlocksInternal(value.children)).join('');
    content = `<details class="mb-4 ${config.marginTop}">
      <summary class="${config.textClass} font-bold ${config.marginBottom} cursor-pointer" id="heading-${block.id}">
        ${renderRichText(value.rich_text)}
      </summary>
      <div class="ml-6 pl-4 border-l-2 border-gray-200">${childrenHtml}</div>
    </details>`;
  }
  
  return content;
}

// 處理列表項目的子內容 - 整合列表項目子內容處理邏輯
async function processListItemChildren(value) {
  if (!value.children || value.children.length === 0) return '';
  
  const childrenHtml = await renderBlocksInternal(value.children);
  return `<div class="mt-2 ml-2 pl-4 border-l-2 border-gray-200">${childrenHtml.join('')}</div>`;
}

async function renderBlock(block) {
  try {
    const { type } = block;
    const value = block[type];

    // 處理空白區塊 - 檢查段落是否為空
    if (type === 'paragraph' && (!value.rich_text || value.rich_text.length === 0)) {
      return `<div class="h-6"></div>`;
    }

    switch (type) {
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return renderHeading(block, type);

      case 'paragraph': {
        let content = `<p class="mb-4 leading-relaxed">${renderRichText(value.rich_text)}</p>`;
        
        // 處理段落的子區塊
        if (value.children && value.children.length > 0) {
          const childrenHtml = (await renderBlocksInternal(value.children)).join('');
          content = `<div class="mb-4">
            <p class="leading-relaxed">${renderRichText(value.rich_text)}</p>
            <div class="ml-6 pl-4 border-l-2 border-gray-200 mt-2">${childrenHtml}</div>
          </div>`;
        }
        
        return content;
      }

      case 'toggle': {
        let content = `<details class="border rounded p-2 bg-gray-50 mb-4 group">
          <summary class="cursor-pointer flex items-center">
            <svg class="w-4 h-4 mr-2 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6 6L14 10L6 14V6Z" />
            </svg>
            ${renderRichText(value.rich_text)}
          </summary>`;
        
        if (value.children && value.children.length > 0) {
          const childrenHtml = (await renderBlocksInternal(value.children)).join('');
          content += `<div class="ml-4 mt-2 space-y-2 pl-4 border-l-2 border-gray-200">${childrenHtml}</div>`;
        }
        
        content += `</details>`;
        return content;
      }

      case 'callout': {
        // 增強的 callout 圖標支持
        const iconHtml = renderCalloutIcon(value.icon);
        let bgColor = 'bg-blue-50';
        let borderColor = 'border-blue-400';
        
        // 根據顏色調整背景和邊框
        if (value.color && value.color !== 'default' && colorMap[value.color]) {
          bgColor = colorMap[value.color].bg;
          borderColor = colorMap[value.color].border;
        }
        
        // 如果沒有子區塊，直接渲染
        if (!value.children || value.children.length === 0) {
          return `<div class="p-4 border-l-4 ${bgColor} ${borderColor} rounded shadow-sm mb-4 flex items-start">
            ${iconHtml}<div>${renderRichText(value.rich_text)}</div>
          </div>`;
        }
        
        // 如果有子區塊，將所有內容包含在同一個色塊容器內
        const childrenHtml = (await renderBlocksInternal(value.children)).join('');
        return `<div class="p-4 border-l-4 ${bgColor} ${borderColor} rounded shadow-sm mb-4">
          <div class="flex items-start mb-2">
            ${iconHtml}<div>${renderRichText(value.rich_text)}</div>
          </div>
          <div class="ml-6 mt-2 border-l-2 ${borderColor} pl-4">
            ${childrenHtml}
          </div>
        </div>`;
      }

      case 'quote': {
        let content = `<blockquote class="border-l-4 pl-4 italic text-gray-600 mb-4">${renderRichText(value.rich_text)}</blockquote>`;
        
        // 處理引用的子區塊
        if (value.children && value.children.length > 0) {
          const childrenHtml = (await renderBlocksInternal(value.children)).join('');
          content = `<div class="mb-4">
            <blockquote class="border-l-4 pl-4 italic text-gray-600">${renderRichText(value.rich_text)}</blockquote>
            <div class="ml-8 pl-4 border-l-2 border-gray-300 mt-2">${childrenHtml}</div>
          </div>`;
        }
        
        return content;
      }

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

      case 'bulleted_list_item': {
        bulletedListLevel++;
        let itemContent = renderRichText(value.rich_text);
        
        // 處理子項目 - 使用公共函數
        const childrenContent = await processListItemChildren(value);
        if (childrenContent) {
          itemContent += childrenContent;
        }
        
        const result = { 
          type, 
          html: `<li class="mb-2">${itemContent}</li>`,
          level: bulletedListLevel
        };
        
        bulletedListLevel--;
        return result;
      }

      case 'numbered_list_item': {
        numberedListLevel++;
        let itemContent = renderRichText(value.rich_text);
        
        // 處理子項目 - 使用公共函數
        const childrenContent = await processListItemChildren(value);
        if (childrenContent) {
          itemContent += childrenContent;
        }
        
        const result = { 
          type, 
          html: `<li class="mb-2">${itemContent}</li>`,
          level: numberedListLevel
        };
        
        numberedListLevel--;
        return result;
      }

      case 'to_do': {
        const checked = value.checked ? 'checked' : '';
        const id = `checkbox-${block.id}`;
        const checkedClass = value.checked ? 'line-through text-gray-500' : '';
        
        // 基本 to_do 項目
        let content = `
          <div class="flex items-start mb-2">
            <input type="checkbox" ${checked} id="${id}" class="mt-1 mr-2 cursor-pointer" 
              onchange="this.nextElementSibling.classList.toggle('line-through'); this.nextElementSibling.classList.toggle('text-gray-500')">
            <div class="${checkedClass}">${renderRichText(value.rich_text)}</div>
          </div>
        `;
        
        // 處理子項目
        if (value.children && value.children.length > 0) {
          const childrenHtml = await renderBlocksInternal(value.children);
          content = `<div class="mb-4">
            <div class="flex items-start">
              <input type="checkbox" ${checked} id="${id}" class="mt-1 mr-2 cursor-pointer" 
                onchange="this.nextElementSibling.classList.toggle('line-through'); this.nextElementSibling.classList.toggle('text-gray-500')">
              <div class="${checkedClass}">${renderRichText(value.rich_text)}</div>
            </div>
            <div class="ml-6 pl-4 border-l-2 border-gray-200 mt-2">${childrenHtml.join('')}</div>
          </div>`;
        }
        
        return content;
      }

      case 'divider':
        return '<hr class="my-6 border-t border-gray-300">';

      case 'table': {
        let tableHtml = '<div class="overflow-x-auto mb-4"><table class="min-w-full border-collapse border border-gray-300">';
        
        if (value.children && value.children.length > 0) {
          // 表格標題行
          if (value.has_column_header) {
            tableHtml += '<thead><tr>';
            for (const cell of value.children[0].table_row.cells) {
              tableHtml += `<th class="border border-gray-300 px-4 py-2 bg-gray-100 font-bold">${renderRichText(cell)}</th>`;
            }
            tableHtml += '</tr></thead>';
          }
          
          // 表格內容
          tableHtml += '<tbody>';
          const startRow = value.has_column_header ? 1 : 0;
          for (let i = startRow; i < value.children.length; i++) {
            tableHtml += '<tr>';
            value.children[i].table_row.cells.forEach((cell, colIdx) => {
              const className = (value.has_row_header && colIdx === 0) ? 'bg-gray-100 font-bold' : '';
              tableHtml += `<td class="border border-gray-300 px-4 py-2 ${className}">${renderRichText(cell)}</td>`;
            });
            tableHtml += '</tr>';
          }
          tableHtml += '</tbody>';
        }
        
        tableHtml += '</table></div>';
        return tableHtml;
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
        return `<div class="mb-4 py-2 px-4 bg-gray-50 overflow-x-auto">
          <code>${value.expression}</code>
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

      case 'table_of_contents':
      case 'column_list':
        return `<div class="mb-4 p-4 bg-gray-50 border rounded">
          <div class="text-gray-500">${type === 'table_of_contents' ? '目錄' : '欄位列表'}功能已停用</div>
        </div>`;

      case 'unsupported':
        return `<div class="h-6"></div>`;

      default:
        return `<div class="text-sm text-gray-400 mb-2">[Unsupported block: ${type}]</div>`;
    }
  } catch (error) {
    console.error(`Error rendering block (${block?.type}):`, error);
    return renderErrorBlock(block?.type, error.message);
  }
}

async function renderBlocksInternal(blocks) {
  if (!blocks || blocks.length === 0) return [];
  
  const htmlChunks = [];
  let listBuffer = [];
  let currentListType = null;
  let currentListLevel = 0;

  for (const block of blocks) {
    try {
      const rendered = await renderBlock(block);

      // 如果是列表項目，收集起來
      if (typeof rendered === 'object' && (rendered.type === 'bulleted_list_item' || rendered.type === 'numbered_list_item')) {
        // 檢查是否需要開始一個新列表
        if (!currentListType || currentListType !== rendered.type || currentListLevel !== rendered.level) {
          // 如果有未處理的列表，先處理它
          if (listBuffer.length) {
            htmlChunks.push(wrapList(currentListType, listBuffer, currentListLevel));
            listBuffer = [];
          }
          currentListType = rendered.type;
          currentListLevel = rendered.level;
        }
        
        listBuffer.push(rendered.html);
      } else {
        // 如果有未處理的列表，先處理它
        if (listBuffer.length) {
          htmlChunks.push(wrapList(currentListType, listBuffer, currentListLevel));
          listBuffer = [];
          currentListType = null;
          currentListLevel = 0;
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
    htmlChunks.push(wrapList(currentListType, listBuffer, currentListLevel));
  }

  return htmlChunks;
}

function wrapList(type, items, level) {
  let tag = 'ul';
  let listClass = '';
  
  // 根據列表類型和層級設置標記樣式
  if (type === 'numbered_list_item') {
    tag = 'ol';
    // 根據層級選擇不同的列表樣式
    switch ((level - 1) % 3) {
      case 0: // 第一層 (1, 2, 3...)
        listClass = 'list-decimal';
        break;
      case 1: // 第二層 (a, b, c...)
        listClass = 'list-[lower-alpha]';
        break;
      case 2: // 第三層 (i, ii, iii...)
        listClass = 'list-[lower-roman]';
        break;
    }
  } else {
    // 無序列表根據層級選擇不同的項目符號
    switch ((level - 1) % 3) {
      case 0: // 第一層 (•)
        listClass = 'list-disc';
        break;
      case 1: // 第二層 (◦)
        listClass = 'list-[circle]';
        break;
      case 2: // 第三層 (‣)
        listClass = 'list-[square]';
        break;
    }
  }
  
  return `<${tag} class="pl-6 space-y-2 mb-4 ${listClass}">${items.join('')}</${tag}>`;
}
