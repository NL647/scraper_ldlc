# Scraper_ldlc
Scraper for LDLC website from url list of products in .txt file.<br />
It gets product name, price, description, availability, product id, product image url and store in sqlite db.<br />
Api to get information for LDLC products from product id as json response.<br />

## Installation
```bash
npm install
```


## Usage scraper
Add url of product in the .txt file<br/>
run command
```bash
node app.js
```
![alt text](http://url/to/img.png)

## Usage api
run command<br/>
```bash
node api.js
```
## Fetch data
Bash
```
curl -X POST -H "Content-Type: application/json" -d '{"ref": "PB00543542"}' http://localhost:3000/scrape
```

Powershell 
```
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/scrape" -ContentType "application/json" -Body '{"ref": "PB00543542"}'
```
