#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const Queue = require('queue-batch');
const puppeteer = require('puppeteer');
const Bundler = require('parcel-bundler');

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
    console.timeEnd('Total time');
    await browser.close();
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
    await page.goto(target, { waitUntil: 'networkidle2' });

    await page.waitFor(config.waitTime);

    const html = await page.evaluate(() => document.documentElement.outerHTML);

    await page.close();

    const outputPath = path.join(config.basePath, route);

    mkdirp.sync(outputPath);

    fs.writeFile(path.join(outputPath, 'index.html'), html.replace(distRegex, '/'), error => {
        console.timeEnd(timmingLabel);
        callback(error);
    });
}

(async () => {
    // server.serve(config.basePath, config.port);
    const command = {
        outDir: config.basePath,
        watch: false,
        cache: false,
        killWorkers: false,
        hmr: false,
        logLevel: 0,
    };
    console.time('Total time');
    console.time('Total Build time');
    console.log('Building in Dev mode');

    process.env.NODE_ENV = '';

    const bundler = new Bundler('./public/index.html', command);
    await bundler.serve(config.port);

    const browser = await puppeteer.launch({ headless: true });
    const queue = new Queue(getAndSavePage.bind(null, browser));

    queue.on('error', error => {
        throw error;
    });

    queue.on('empty', () => {
        console.timeEnd('Total Snapshot time');

        bundler.once('buildEnd', () => {
            console.timeEnd('Total Rebuild time');
            shutdown(browser);
        });

        console.log('Rebuilding in Prod mode');
        console.time('Total Rebuild time');
        process.env.NODE_ENV = 'production';
        bundler.bundle();
    });

    bundler.once('buildEnd', () => {
        console.timeEnd('Total Build time');
        console.time('Total Snapshot time');
        queue.concat(config.routes);
    });
})();
