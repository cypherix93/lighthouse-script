const fs = require('fs');
const { execSync } = require('child_process');
const { spawn, Thread, Worker } = require('threads');

function main() {
     fs.readFile('./urls.txt', 'utf8', async function (err, data) {
         if (err) {
             throw err;
         };
         let urls = data.split(/\r?\n/);

         // const lighthouse = await spawn(new Worker('./workers/lighthouse'));
         // lighthouse.runLighthouse(qaUrls[0]);
         // await Thread.terminate(lighthouse);

         urls.forEach((url) => {
             runLighthouse(url)
         })
    })

}

main();

function runLighthouse(url) {
    let filename = url.replace('https://egifter.qa-aurora.egifter.dev/', '');
    filename = filename ? filename : 'home'
    const removeSlashes = filename.replace(/\//g, "_")

    execSync(`lighthouse ${url} --chrome-flags="--headless" --preset="desktop" --output-path="./reports/${removeSlashes}.html"`, (err, stdout, stderr) => {
        if (err) {
            throw err;
        }

        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
    });
}