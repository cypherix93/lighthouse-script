import {expose} from 'threads/worker';
import {exec} from 'child_process';

expose({
    runLighthouse(url, options) {
        const command = `yarn lighthouse ${url} ${options.join(' ')}`;

        return new Promise((resolve, reject) => {
            exec(command, {maxBuffer: 10 * 1024 * 1024}, (error, stdout, stderr) => {
                if (error) {
                    resolve({error});

                    return;
                }

                resolve({stdout, stderr});
            });
        });
    }
});