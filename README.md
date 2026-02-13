# Alibaba & Yiwugo Scraper
[https://lablnet.com/project/alibabascraper](https://lablnet.com/project/alibabascraper)

This is a robust web scraper that extracts data from **Alibaba** and **Yiwugo** (义乌购) websites. It's multi-threaded and utilizes Playwright to efficiently scrape data. 

## Supported Platforms

| Platform | Description | Module |
|----------|-------------|--------|
| [Alibaba.com](https://www.alibaba.com) | Global B2B wholesale marketplace | `alibaba/` |
| [Yiwugo.com](https://www.yiwugo.com) | China's largest wholesale market (Yiwu) | `yiwugo/` |

## Installation

1. Clone the repository.
2. Run `npm install` to install the dependencies.
3. Copy `.env.example` to `.env` and update the values.

## Usage

### Alibaba Scraper

```bash
# Get categories and store them in the database
node ./alibaba/categories.js

# Start the scraper
node ./alibaba/processProducts.js

# Run in background
nohup node ./alibaba/processProducts.js &
```

The script will create a `categories_queue` file in the root directory and keep running until the queue is empty.

### Yiwugo Scraper

```bash
# Get Yiwugo categories
node ./yiwugo/categories.js

# Search and scrape products by keyword
node ./yiwugo/searchProducts.js "杯子"          # default 3 pages
node ./yiwugo/searchProducts.js "toys" 5        # custom page limit
```

Results are saved as JSON files in the project root.

#### Yiwugo Data Fields

Each scraped product includes:

- `title` — Product name
- `price` — Unit price (CNY)
- `minOrder` — Minimum order quantity
- `supplier` — Supplier/shop name
- `supplierLink` — Link to supplier's store
- `location` — Supplier location (e.g., 义乌市)
- `images` — Array of product image URLs
- `attributes` — Key-value pairs of product specs

> 💡 For a hosted version of the Yiwugo scraper with cloud execution, check out the [Yiwugo Scraper on Apify Store](https://apify.com/jungle_intertwining/yiwugo-scraper).

## Features

* Scrape data from Alibaba and Yiwugo websites
* Multi-threaded (Alibaba module)
* Save data to Amazon DynamoDB (Alibaba) or JSON files (Yiwugo)
* Proxy support
* Chinese text encoding support (Yiwugo)
* Proper error handling and logging

## License

* MIT
