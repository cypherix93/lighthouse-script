import os from 'os';
import consola from 'consola';

import {getUrls} from './getUrls.mjs';
import {Pool, spawn, Worker} from 'threads';

// consola wrap consoles
consola.wrapAll();

const SITE_HOST = `egifter.qa-aurora.egifter.dev`;

const LH_OPTIONS = [
    `--chrome-flags="--headless"`,
    `--preset="desktop"`,
    `--output="json"`
];

async function main() {
    const lighthouseWorkerPool = Pool(
        () => spawn(
            new Worker('./workers/lighthouse.mjs')
        ),
        {
            name: 'LighthouseThreadPool',
            concurrency: 4,
            size: Math.min(4, os.cpus().length / 2) // 4 or half of available cores
        }
    );

    const sitemapUrls = await getUrls(SITE_HOST);

    consola.info(`Loaded ${sitemapUrls.length} URLs from sitemap.xml`);

    const urlsToTest = sitemapUrls
        .filter(x =>
            !x.includes('-gift-card-') // payment method pages
        );

    consola.info(`Filtered down to ${urlsToTest.length} URLs`);

    for (const url of urlsToTest) {
        lighthouseWorkerPool
            .queue(worker => {
                consola.info(`Started processing URL: ${url}`);

                return worker.runLighthouse(url, LH_OPTIONS);
            })
            .then(result => {
                consola.success(`Finished processing URL: ${url}\n${result}`);
            })
            .catch(err => {
                consola.error(`Error processing URL: ${url}`);
                throw err;
            });
    }

    consola.info(`Queued ${urlsToTest.length} URLs for processing`);

    // cleanup on exit
    const signals = [`exit`, `uncaughtException`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`];

    signals.forEach((eventType) => {
        process.on(eventType, () => {
            lighthouseWorkerPool.terminate();
        });
    });
}

main();