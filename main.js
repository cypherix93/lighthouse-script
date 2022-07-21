const fs = require('fs');
const { execSync } = require('child_process');
const { spawn, Thread, Worker } = require('threads');



function main() {
     fs.readFile('./urls.txt', 'utf8', async function (err, data) {
         if (err) {
             throw err;
         };
         console.log(data)
         console.log(data.split(/\r?\n/));
         let urls = data.split(/\r?\n/);

         urls = urls.slice(0, 10)

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

    execSync(`lighthouse ${url} --chrome-flags="--headless" --preset="desktop" --output-path="./reports/${removeSlashes}"`, (err, stdout, stderr) => {
        if (err) {
            throw err;
        }

        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
    });
}


//
// // use child.stdout.setEncoding('utf8'); if you want text chunks
// child.stdout.on('data', (chunk) => {
//     // data from standard output is here as buffers
// });
//
// // since these are streams, you can pipe them elsewhere
// child.stderr.pipe(dest);
//
// child.on('close', (code) => {
//     console.log(`child process exited with code ${code}`);
// });