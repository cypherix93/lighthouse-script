import path from 'path';
import axios from 'axios';

export async function getUrls(host) {
    const sitemapXml = await fetchSitemap(host);

    const sitemapLocs = sitemapXml.split(/\r?\n/)
        .filter(x => x.includes('<loc>'));

    const urls = sitemapLocs
        .map(x => x.replace(/<loc\/?>/g, ''));

    return urls;
}

async function fetchSitemap(host) {
    if (!host.startsWith('http')) {
        host = 'https://' + host;
    }

    const sitemapUrl = path.join(host, 'sitemap.xml');

    const sitemapXml = await axios.get(sitemapUrl);

    return sitemapXml;
}