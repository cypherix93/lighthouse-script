const fs = require('fs');

const REGEX_PATTERN = RegExp('https:\/\/www.egifter.com\/(?:(?!<\/loc>).)*', 'g');

function getUrls() {
    fs.readFile('./sitemap.txt', 'utf8', async function (err, data) {
        if (err) {
            throw err;
        };
        let results = data.match(REGEX_PATTERN);
        const absolutePaths = results.map(result => result.replace('https://www.egifter.com/', ''));
        let qaUrls = absolutePaths.map(absolutePath => 'https://egifter.qa-aurora.egifter.dev/' + absolutePath + '\n').join('')
        fs.writeFile('urls.txt', qaUrls, (err) => {
            if (err) {
                throw err;
            }
        })
    })

}

getUrls();