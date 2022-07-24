import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import consola from 'consola';

import {getUrls} from './getUrls.mjs';
import {Pool, spawn, Worker} from 'threads';

// import cliProgress from 'cli-progress';

// consola wrap consoles
consola.wrapAll();

const SITE_HOST = process.env.SITE_HOST || `egifter.qa-aurora.egifter.dev`;

const LH_OPTIONS = process.env.LH_OPTIONS?.split(/\s+/) || [
    `--chrome-flags="--headless"`,
    `--preset="desktop"`,
    `--output="json"`
];

const WORKER_POOL_SIZE = process.env.WORKER_POOL_SIZE || Math.min(4, os.cpus().length / 2); // 4 or half of available cores

const OUTPUT_PATH = process.env.OUTPUT_PATH || './.output';

const outDir = path.resolve(OUTPUT_PATH, new Date().toISOString().replace(/T.*/, ''));
const reportDir = path.resolve(outDir, 'reports');
const logsDir = path.resolve(outDir, 'logs');

async function main() {
    consola.start(`Warming up engines...`);

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

    consola.info(`Reports and Logs will be written to: ${outDir}`);

    const sitemapUrls = await getUrls(SITE_HOST);

    consola.info(`Loaded ${sitemapUrls.length} URLs from sitemap.xml`);

    const urlsToTest = sitemapUrls
        .filter(x =>
            !x.includes('-gift-card-') // payment method gift card pages
        );

    consola.info(`Filtered down to ${urlsToTest.length} URLs`);

    const urlsFilePath = path.resolve(outDir, 'urls.log');
    await writeOutputFile(urlsFilePath, urlsToTest.join('\n'));

    consola.info(`Test URLs logged in: ${urlsFilePath}`);

    // progressBar.start(urlsToTest.length, 0);

    consola.start(`Blast off! 🚀`);

    const tasks = [];

    for (const url of urlsToTest) {
        const task = lighthouseWorkerPool
            .queue(worker => {
                consola.info(`Started processing URL: ${url}`);

                return worker.runLighthouse(url, LH_OPTIONS);
            })
            .then(({stdout, stderr, error}) => {
                if (error) {
                    consola.error(`Error processing URL: ${url}\nReason: ${error}`);

                    return writeReportResult(url, null, error);
                }

                consola.success(`Finished processing URL: ${url}`);

                return writeReportResult(url, stdout, stderr);
            })
            // .then(() => {
            //     progressBar.increment();
            // })
            .catch(error => {
                consola.fatal(`Error processing URL: ${url}`);

                return writeReportResult(url, null, error);
            });

        tasks.push(task);
    }

    consola.ready(`Queued ${urlsToTest.length} URLs for processing`);

    // cleanup on exit
    const signals = [`exit`, `uncaughtException`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`];

    signals.forEach((eventType) => {
        process.on(eventType, (...args) => {
            if (eventType !== 'exit') {
                consola.fatal(`Process received signal: ${eventType}\nargs: ${args.join('\n')}`);
            }

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

    process.exit(0);
}

async function writeReportResult(url, report, logs) {
    const fileName = url
        .replace(/^https?:\/\/(.*?)\//, '')
        .replace(/\//g, '_') || '_';

    try {
        if (report) {
            // delete the first line (stdout logs the command as first line)
            report = report.replace(/^.*?\n/, '');

            const reportOutPath = path.join(reportDir, fileName + '.json');

            await writeOutputFile(reportOutPath, report);

            consola.success(`Report saved: ${reportOutPath}`);
        }

        if (logs) {
            const logOutPath = path.join(logsDir, fileName + '.log');

            await writeOutputFile(logOutPath, logs);
        }
    }
    catch (error) {
        consola.error(`Report failed to save for URL: ${url}\nReason: ${error}`);
    }
}

async function writeOutputFile(filePath, fileContents) {
    const dirPath = path.dirname(filePath);

    await fs.mkdirp(dirPath);
    await fs.writeFile(filePath, fileContents, 'utf8');
}

main();