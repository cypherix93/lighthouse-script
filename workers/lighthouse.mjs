import {expose} from 'threads/worker';

expose({
    runLighthouse(url, options) {
        const command = `yarn lighthouse ${url} ${options.join(' ')}`;

        return new Promise((resolve, reject) => {
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    reject(err);

                    return;
                }

                if (stderr) {
                    console.error(stderr);
                }

                resolve(stdout);
            });
        });
    }
});