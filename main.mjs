import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import consola from 'consola';

import {getUrls} from './getUrls.mjs';
import {Pool, spawn, Worker} from 'threads';

import cliProgress from 'cli-progress';

// consola wrap consoles
consola.wrapAll();

const SITE_HOST = `egifter.qa-aurora.egifter.dev`;

const LH_OPTIONS = [
    `--chrome-flags="--headless"`,
    `--preset="desktop"`,
    `--output="json"`
];

const WORKER_POOL_SIZE = Math.min(4, os.cpus().length / 2); // 4 or half of available cores

async function main() {
    const lighthouseWorkerPool = Pool(
        () => spawn(
            new Worker('./workers/lighthouse.mjs')
        ),
        {
            name: 'LighthouseThreadPool',
            size: WORKER_POOL_SIZE
        }
    );

    // const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    consola.ready(`Worker Pool initialized with ${WORKER_POOL_SIZE} workers`);

    const sitemapUrls = await getUrls(SITE_HOST);

    consola.info(`Loaded ${sitemapUrls.length} URLs from sitemap.xml`);

    const urlsToTest = sitemapUrls
        .filter(x =>
            !x.includes('-gift-card-') // payment method pages
        )
        .slice(0, 4);

    consola.info(`Filtered down to ${urlsToTest.length} URLs`);

    // progressBar.start(urlsToTest.length, 0);

    const tasks = [];

    for (const url of urlsToTest) {
        const task = lighthouseWorkerPool
            .queue(worker => {
                consola.info(`Started processing URL: ${url}`);

                return worker.runLighthouse(url, LH_OPTIONS);
            })
            .then(({stdout, stderr}) => {
                consola.success(`Finished processing URL: ${url}`);

                return writeReportResult(url, stdout, stderr);
            })
            .then(() => {
                // progressBar.increment();
            })
            .catch(err => {
                consola.error(`Error processing URL: ${url}`);
                throw err;
            });

        tasks.push(task);
    }

    consola.ready(`Queued ${urlsToTest.length} URLs for processing`);

    // cleanup on exit
    const signals = [`exit`, `uncaughtException`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`];

    signals.forEach((eventType) => {
        process.on(eventType, () => {
            consola.info(`Terminating worker pool...`);

            lighthouseWorkerPool.terminate();

            // progressBar.stop();

            consola.success(`Worker pool terminated. Goodbye! 👋`);

            if (eventType !== 'exit') {
                process.exit(1);
            }
        });
    });

    await Promise.all(tasks);

    consola.success(`All done! 🎉`);
}

async function writeReportResult(url, report, logs) {
    const outDir = './.output';
    const reportDir = path.resolve(outDir, 'reports');
    const logsDir = path.resolve(outDir, 'logs');

    const fileName = url
        .replace(/^https?:\/\/(.*?)\//, '')
        .replace(/\//g, '_') || '_';

    const reportOutPath = path.join(reportDir, fileName + '.json');
    const logOutPath = path.join(logsDir, fileName + '.log');

    // delete the first line (stdout logs the command as first line)
    report = report.replace(/^.*?\n/, '');

    try {
        await fs.mkdirp(reportDir);
        await fs.mkdirp(logsDir);

        await fs.writeFile(reportOutPath, report, 'utf8');
        await fs.writeFile(logOutPath, logs, 'utf8');

        consola.success(`Report saved: ${reportOutPath}`);
    }
    catch (error) {
        consola.error(`Report failed to save for URL: ${url}\nReason: ${error}`);
    }
}

main();