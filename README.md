```
notion-design-pack-viewer/
├── public/
│  ├── index.html               # 主入口，包含 sidebar（來自 Notion Database）+ viewer iframe 載入 page_view 或 db_view
│  ├── page_view.html           # 單一 Notion Page 頁面呈現，根據 pageId 呼叫 API 並使用 renderBlocks.js 呈現
│  ├── db_view.html             # 資料庫頁面，以 iframe 嵌入 Notion 網址（適合直接顯示原生 Notion Database）
│  └── assets/
│      └── renderBlocks.js      # 前端用於將 Notion Block 陣列轉換為 HTML 的渲染引擎，支援段落、列表、標題、圖片、code block 等格式
│
├── api/
│   ├── notion.js            # 從 Notion Database 抓取頁面清單與分類資訊（含 group/title/icon...）
│   ├── page.js              # 根據 pageId 抓取 Notion block 結構（含子層）並轉為前端可用格式
│   └── page_with_db.js      # 根據 pageId 抓取頁面內的 Child Database資訊
│
└── package.json             # Node.js 依賴（@notionhq/client）與基本資訊

``` 
```
notion-design-pack-viewer/
├── index.html               # 主入口，包含 sidebar（來自 Notion Database）+ viewer iframe 載入 page_view 或 db_view
├── page_view.html           # 單一 Notion Page 頁面呈現，根據 pageId 呼叫 API 並使用 renderBlocks.js 呈現
├── db_view.html             # 資料庫頁面，以 iframe 嵌入 Notion 網址（適合直接顯示原生 Notion Database）
├── api/
│   ├── notion.js            # 從 Notion Database 抓取頁面清單與分類資訊（含 group/title/icon...）
│   ├── page.js              # 根據 pageId 抓取 Notion block 結構（含子層）並轉為前端可用格式
│   └── page_with_db.js      # 根據 pageId 抓取頁面內的 Child Database資訊
├── assets/
│   └── renderBlocks.js      # 前端用於將 Notion Block 陣列轉換為 HTML 的渲染引擎，支援段落、列表、標題、圖片、code block 等格式
└── package.json             # Node.js 依賴（@notionhq/client）與基本資訊

``` 
```
本地CSS版
notion-design-pack-viewer/
├── index.html               # 主入口，包含 sidebar（來自 Notion Database）+ viewer iframe 載入 page_view 或 db_view
├── page_view.html           # 單一 Notion Page 頁面呈現，根據 pageId 呼叫 API 並使用 renderBlocks.js 呈現
├── db_view.html             # 資料庫頁面，以 iframe 嵌入 Notion 網址（適合直接顯示原生 Notion Database）
├── configs/
│   ├── vite.config.js       # Vite 編譯器主設定
│   ├── tailwind.config.js   # Tailwind 樣式設定
│   └── postcss.config.js    # PostCSS 插件設定
├── src/
│   └── style.css            # Tailwind 的引入點及新增樣式入口
├── api/
│   ├── notion.js            # 從 Notion Database 抓取頁面清單與分類資訊（含 group/title/icon...）
│   ├── page.js              # 根據 pageId 抓取 Notion block 結構（含子層）並轉為前端可用格式
│   └── page_with_db.js      # 根據 pageId 抓取頁面內的 Child Database資訊
├── assets/
│   └── renderBlocks.js      # 前端用於將 Notion Block 陣列轉換為 HTML 的渲染引擎，支援段落、列表、標題、圖片、code block 等格式
└── package.json             # Node.js 依賴（@notionhq/client）與基本資訊

``` 
