import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';

export async function getUrls(host) {
    // const sitemapXml = await fetchSitemap(host);
    const sitemapXml = await readSitemapFile('./data/sitemap.xml');

    const sitemapLocs = sitemapXml.split(/\r?\n/)
        .filter(x => x.includes('<loc>'));

    const urls = sitemapLocs
        .map(x => x.replace(/<\/?loc>/g, '').trim())
        .sort();

    return urls;
}

async function readSitemapFile(filePath) {
    return await fs.readFile(filePath, 'utf8');
}

async function fetchSitemap(host) {
    if (!host.startsWith('http')) {
        host = 'https://' + host;
    }

    const sitemapUrl = path.join(host, 'sitemap.xml');

    const sitemapXml = await axios.get(sitemapUrl);

    return sitemapXml;
}