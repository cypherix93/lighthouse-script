import {expose} from 'threads/worker';
import {exec} from 'child_process';

expose({
    runLighthouse(url, options) {
        const command = `yarn lighthouse ${url} ${options.join(' ')}`;

        return new Promise((resolve, reject) => {
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    reject(err);

                    return;
                }

                resolve({stdout, stderr});
            });
        });
    }
});