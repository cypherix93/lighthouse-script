import os from 'os';
import {getUrls} from './getUrls.mjs';
import {Pool, spawn, Worker} from 'threads';

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

    for (const url of sitemapUrls) {
        lighthouseWorkerPool
            .queue(worker =>
                worker.runLighthouse(url, LH_OPTIONS)
            )
            .then(result => {
                console.log(result);
            });
    }

    // cleanup on exit
    const signals = [`exit`, `uncaughtException`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`];

    signals.forEach((eventType) => {
        process.on(eventType, () => {
            lighthouseWorkerPool.terminate();
        });
    });
}

main();