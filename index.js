#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const Queue = require('queue-batch');
const mkdirp = require('mkdirp');
const server = require('./server');

const distRegex = /\/dist\//g;
const port = 3000;

const baseConfig = {
    basePath: path.join(process.cwd(), 'dist'),
    port,
    rootUrl: `http://localhost:${port}`,
    waitTime: 200,
    viewport: {
        width: 1600,
        height: 950,
    },
    includeExternal: false,
    routes: ['/'],
};

const loadedConfig = require(path.join(process.cwd(), 'croc'));
const config = { ...baseConfig, ...loadedConfig };

const skipExternalRequests = async page => {
    await page.setRequestInterception(true);
    page.on('request', async request => {
        if (request.url().startsWith(config.rootUrl)) {
            request.continue();
        } else {
            request.abort();
        }
    });
};

async function shutdown(browser) {
    await browser.close();

    console.timeEnd('Total time');
    process.exit(0);
}

async function getAndSavePage(browser, route, callback) {
    const timmingLabel = `Processed ${route} in`;

    console.time(timmingLabel);

    const target = `${config.rootUrl}${route}`;
    const page = await browser.newPage();

    if (!config.includeExternal) {
        await skipExternalRequests(page);
    }

    await page.setViewport({ width: config.viewport.width, height: config.viewport.height });
    await page.goto(target, {waitUntil: 'networkidle2'});

    await page.waitFor(config.waitTime);

    const html = await page.evaluate(() => document.documentElement.outerHTML);

    await page.close();

    const outputPath = path.join(config.basePath, route);

    mkdirp.sync(outputPath);

    fs.writeFile(path.join(outputPath, 'index.html'), html.replace(distRegex, '"/'), error => {
        console.timeEnd(timmingLabel);
        callback(error);
    });
}

(async () => {
    // server.serve(config.basePath, config.port);

    const browser = await puppeteer.launch({ headless: false });
    const queue = new Queue(getAndSavePage.bind(null, browser));

    queue.on('error', error => {
        throw error;
    });

    queue.on('empty', () => shutdown(browser));

    console.time('Total time');

    queue.concat(config.routes);
})();
