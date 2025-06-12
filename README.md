```
2025.06.12
notion-design-pack-viewer/
├── index.html             # 主入口頁面，包含側邊欄與主要內容 iframe viewer
├── viewer.html            # 統一的 Notion 頁面呈現介面（支援 mode=api 或 mode=embed）
├── api/
│   ├── notion.js          # 從 Notion Database 中取得頁面清單與欄位（包含分群、icon、active 等）
│   └── page.js            # 根據 pageId 抓取 Notion Block 並含子階層回傳（max depth 3）
├── assets/
│   └── renderBlocks.js    # 前端渲染引擎，將 Notion Block 陣列轉為 Tailwind 美化後的 HTML
└── package.json           # 專案基本設定與相依套件（目前使用 @notionhq/client）

```

```
2025.06.11
notion-design-pack-viewer/
├── package.json
├── index.html             # 主入口 + sidebar + default viewer
├── page_view.html         # 單一 Notion Page 顯示模式
├── db_view.html           # 資料庫（例如分組清單或表格）顯示模式
├── api/
│    ├── notion.js
│    └── page.js
└── assets/
     └── renderBlocks.js

``` 
