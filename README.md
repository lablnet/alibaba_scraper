# Alibaba & Yiwugo Scraper
[https://lablnet.com/project/alibabascraper](https://lablnet.com/project/alibabascraper)

This is a robust web scraper that extracts data from **Alibaba** and **Yiwugo** (义乌购) websites. It's multi-threaded and utilizes Playwright to efficiently scrape data. The Alibaba scraper is capable of scraping the entire site (~4-6 months), while the Yiwugo module focuses on China's largest wholesale market platform.

## Supported Platforms

| Platform | Directory | Description |
|----------|-----------|-------------|
| **Alibaba** | `alibaba/` | International wholesale marketplace |
| **Yiwugo** | `yiwugo/` | China's Yiwu wholesale market (义乌购) — 75,000+ shops, 4M+ products |

### Installation
- Clone the repository.
- Run `npm install` to install the dependencies.
- Copy `.env.example` to `.env` and update the values.

### Usage — Alibaba
- Run `node ./alibaba/categories.js` to get the categories and store them in the database.
- Run `node ./alibaba/processProducts.js` to start the scraper.
    - As you can not keep the terminal open so you can use nohup to run the script in background.
    - `nohup node ./alibaba/processProducts.js &`
    - The script will create `categories_queue1` queue file in the root directory, and it will keep running until the queue is empty.

### Usage — Yiwugo
- Run `node ./yiwugo/categories.js` to scrape Yiwugo product categories.
- Run `node ./yiwugo/processProducts.js` to start scraping products from all categories.
    - `nohup node ./yiwugo/processProducts.js &`
    - The script reads from `yiwugo_categories_queue.txt` and processes until the queue is empty.

#### Yiwugo Data Fields

Each scraped Yiwugo product includes:

| Field | Description |
|-------|-------------|
| `title` | Product name (Chinese) |
| `price` | Unit price or price range |
| `minOrder` | Minimum order quantity |
| `supplier` | Shop/supplier name |
| `supplierLink` | Link to supplier's Yiwugo store |
| `location` | Market district/address in Yiwu |
| `category` | Product category |
| `images` | Product image URLs |

> **Tip:** For a hosted, no-code version of the Yiwugo scraper, check out the [Yiwugo Scraper on Apify Store](https://apify.com/jungle_intertwining/yiwugo-scraper).

### Features

* Scrape data from Alibaba and Yiwugo websites
* Multi-threaded (worker threads for parallel category processing)
* Save data to Amazon DynamoDB
* Proxy support
* Chinese text encoding handled (Yiwugo)
* Proper error handling and logging

### License

* MIT
