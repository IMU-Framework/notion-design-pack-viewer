// renderBlocks.js - 整合版本：修正 equation 和 column 渲染

function renderErrorBlock(type, errorMessage = '') {
  return `<div class="p-2 border border-red-300 bg-red-50 text-red-700 rounded mb-4">
    [Error rendering block: ${type}] ${errorMessage}
  </div>`;
}

// 初始化 MathJax
function initMathJax() {
  if (window.MathJax) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    // 創建 MathJax 配置
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']]
      },
      svg: {
        fontCache: 'global'
      },
      startup: {
        pageReady: () => {
          resolve();
        }
      }
    };

    // 載入 MathJax 腳本
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    script.async = true;
    document.head.appendChild(script);
  });
}

window.renderBlocks = async function(blocks) {
  // 初始化 MathJax
  await initMathJax();
  const result = await renderBlocksInternal(blocks);
  
  // 如果頁面包含數學公式，處理渲染
  if (document.querySelector('.math-inline')) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      await window.MathJax.typesetPromise();
    }
  }
  
  return result;
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

// 支援 TeX 風格方程式與 MathJax
function renderEquation(expression) {
  // 使用 MathJax 格式
  return `<div class="mb-4 py-2 px-4 bg-gray-50 overflow-x-auto">
    <div class="math-inline">$${expression}$</div>
  </div>`;
}

// 生成目錄項目
function generateTocItem(headingText, level) {
  const indentClass = level === 1 ? '' : `ml-${(level-1)*4}`;
  const sizeClass = level === 1 ? 'text-base font-medium' : 'text-sm';
  return `<div class="${indentClass} ${sizeClass} py-1 hover:text-blue-600">
    ${headingText}
  </div>`;
}

async function renderBlock(block) {
  try {
    const { type } = block;
    const value = block[type];

    // 處理空白區塊 - 檢查段落是否為空
    if (type === 'paragraph' && (!value.rich_text || value.rich_text.length === 0)) {
      // 返回一個帶有適當間距的空白區塊
      return `<div class="h-6"></div>`;
    }

    switch (type) {
      case 'heading_1': {
        let content = `<h1 class="text-3xl font-bold mb-2" id="heading-${block.id}">${renderRichText(value.rich_text)}</h1>`;
        
        // 支援標題的 Toggle 功能
        if (value.is_toggleable && value.children && value.children.length > 0) {
          const childrenHtml = (await renderBlocksInternal(value.children)).join('');
          content = `<details class="mb-4">
            <summary class="text-3xl font-bold mb-2 cursor-pointer" id="heading-${block.id}">${renderRichText(value.rich_text)}</summary>
            <div class="ml-6 pl-4 border-l-2 border-gray-200">${childrenHtml}</div>
          </details>`;
        }
        
        return content;
      }
      
      case 'heading_2': {
        let content = `<h2 class="text-2xl font-bold mb-2" id="heading-${block.id}">${renderRichText(value.rich_text)}</h2>`;
        
        // 支援標題的 Toggle 功能
        if (value.is_toggleable && value.children && value.children.length > 0) {
          const childrenHtml = (await renderBlocksInternal(value.children)).join('');
          content = `<details class="mb-4">
            <summary class="text-2xl font-bold mb-2 cursor-pointer" id="heading-${block.id}">${renderRichText(value.rich_text)}</summary>
            <div class="ml-6 pl-4 border-l-2 border-gray-200">${childrenHtml}</div>
          </details>`;
        }
        
        return content;
      }
      
      case 'heading_3': {
        let content = `<h3 class="text-xl font-bold mb-2" id="heading-${block.id}">${renderRichText(value.rich_text)}</h3>`;
        
        // 支援標題的 Toggle 功能
        if (value.is_toggleable && value.children && value.children.length > 0) {
          const childrenHtml = (await renderBlocksInternal(value.children)).join('');
          content = `<details class="mb-4">
            <summary class="text-xl font-bold mb-2 cursor-pointer" id="heading-${block.id}">${renderRichText(value.rich_text)}</summary>
            <div class="ml-6 pl-4 border-l-2 border-gray-200">${childrenHtml}</div>
          </details>`;
        }
        
        return content;
      }

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
        if (value.color && value.color !== 'default') {
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
          
          if (colorMap[value.color]) {
            bgColor = colorMap[value.color].bg;
            borderColor = colorMap[value.color].border;
          }
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
        let itemContent = renderRichText(value.rich_text);
        
        // 處理子項目
        if (value.children && value.children.length > 0) {
          const childrenHtml = await renderBlocksInternal(value.children);
          // 檢查子項目是否包含列表項目
          const hasListItems = value.children.some(child => 
            child.type === 'bulleted_list_item' || child.type === 'numbered_list_item');
          
          if (hasListItems) {
            // 如果子項目包含列表項目，直接添加
            itemContent += childrenHtml.join('');
          } else {
            // 如果子項目不包含列表項目，添加額外的縮進
            itemContent += `<div class="mt-2">${childrenHtml.join('')}</div>`;
          }
        }
        
        return { 
          type, 
          html: `<li>${itemContent}</li>` 
        };
      }

      case 'numbered_list_item': {
        let itemContent = renderRichText(value.rich_text);
        
        // 處理子項目
        if (value.children && value.children.length > 0) {
          const childrenHtml = await renderBlocksInternal(value.children);
          // 檢查子項目是否包含列表項目
          const hasListItems = value.children.some(child => 
            child.type === 'bulleted_list_item' || child.type === 'numbered_list_item');
          
          if (hasListItems) {
            // 如果子項目包含列表項目，直接添加
            itemContent += childrenHtml.join('');
          } else {
            // 如果子項目不包含列表項目，添加額外的縮進
            itemContent += `<div class="mt-2">${childrenHtml.join('')}</div>`;
          }
        }
        
        return { 
          type, 
          html: `<li>${itemContent}</li>` 
        };
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

      case 'to_do': {
        const checked = value.checked ? 'checked' : '';
        const id = `checkbox-${block.id}`;
        let content = `
          <div class="flex items-start mb-2">
            <input type="checkbox" ${checked} id="${id}" class="mt-1 mr-2 cursor-pointer" onchange="this.nextElementSibling.classList.toggle('line-through'); this.nextElementSibling.classList.toggle('text-gray-500')">
            <div class="${value.checked ? 'line-through text-gray-500' : ''}">${renderRichText(value.rich_text)}</div>
          </div>
        `;
        
        // 處理子項目
        if (value.children && value.children.length > 0) {
          const childrenHtml = await renderBlocksInternal(value.children);
          content = `<div class="mb-4">
            <div class="flex items-start">
              <input type="checkbox" ${checked} id="${id}" class="mt-1 mr-2 cursor-pointer" onchange="this.nextElementSibling.classList.toggle('line-through'); this.nextElementSibling.classList.toggle('text-gray-500')">
              <div class="${value.checked ? 'line-through text-gray-500' : ''}">${renderRichText(value.rich_text)}</div>
            </div>
            <div class="ml-6 pl-4 border-l-2 border-gray-200 mt-2">${childrenHtml.join('')}</div>
          </div>`;
        }
        
        return content;
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
        return renderEquation(value.expression);
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

      case 'table_of_contents': {
        // 改進的目錄實現，使用 Tailwind 樣式
        return `<nav class="mb-6 p-4 border rounded-lg bg-gray-50">
          <div class="text-lg font-medium mb-2 text-gray-700 border-b pb-2">目錄</div>
          <div class="toc-content space-y-1 text-gray-600">
            <!-- 目錄內容將通過 JavaScript 動態填充 -->
            <div class="text-sm text-center text-gray-400 py-2">載入目錄中...</div>
          </div>
          <script>
            // 在頁面載入完成後填充目錄
            document.addEventListener('DOMContentLoaded', () => {
              const tocContainer = document.querySelector('.toc-content');
              if (!tocContainer) return;
              
              // 清空載入訊息
              tocContainer.innerHTML = '';
              
              // 查找所有標題
              const headings = document.querySelectorAll('h1, h2, h3');
              if (headings.length === 0) {
                tocContainer.innerHTML = '<div class="text-sm text-center text-gray-400 py-2">無可用目錄項目</div>';
                return;
              }
              
              // 創建目錄項目
              headings.forEach(heading => {
                const level = parseInt(heading.tagName.substring(1));
                const text = heading.textContent;
                const id = heading.id || '';
                
                const indentClass = level === 1 ? '' : \`ml-\${(level-1)*4}\`;
                const sizeClass = level === 1 ? 'text-base font-medium' : 'text-sm';
                
                const tocItem = document.createElement('div');
                tocItem.className = \`\${indentClass} \${sizeClass} py-1 hover:text-blue-600\`;
                
                if (id) {
                  const link = document.createElement('a');
                  link.href = \`#\${id}\`;
                  link.textContent = text;
                  link.className = 'hover:underline';
                  tocItem.appendChild(link);
                } else {
                  tocItem.textContent = text;
                }
                
                tocContainer.appendChild(tocItem);
              });
            });
          </script>
        </nav>`;
      }

      case 'column_list': {
        if (!block.children || block.children.length === 0) return '';
        
        // 計算每個欄位的寬度
        const columnCount = block.children.length;
        const columnWidth = Math.floor(12 / Math.min(columnCount, 4)); // 最多4欄，使用12格網格系統
        
        const columnHtml = await Promise.all(block.children.map(async (col, index) => {
          const childrenHtml = await renderBlocksInternal(col.children || []);
          return `<div class="w-full md:w-${columnWidth}/12 p-2">
            <div class="h-full">${childrenHtml.join('')}</div>
          </div>`;
        }));
        
        return `<div class="flex flex-wrap -mx-2 mb-6">${columnHtml.join('')}</div>`;
      }

      // 處理空白區塊 - 這是為了兼容可能的其他空白區塊類型
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
