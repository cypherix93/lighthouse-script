const { expose } = require('threads/worker');


expose({
    runLighthouse(url) {
        exec(`lighthouse ${url} --chrome-flags="--headless" --preset="desktop" --output="json" --output-path="./reports/${url}"`, (err, stdout, stderr) => {
            if (err) {
                throw err;
            }

            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
        });
    }
})