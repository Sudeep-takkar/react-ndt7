import download_worker_script from './ndt7-download.js';
import upload_worker_script from './ndt7-upload.js';

const ndt7_cb = (name, callbacks, defaultFn) => {
    if (typeof (callbacks) !== 'undefined' && name in callbacks) {
        return callbacks[name];
    } else if (typeof defaultFn !== 'undefined') {
        return defaultFn;
    } else {
        // If no default function is provided, use the empty function.
        return () => { };
    }
};

const defaultErrCallback = (err) => {
    throw new Error(err);
};

export const discoverServerURLs = async (config, userCallbacks) => {
    const callbacks = {
        error: ndt7_cb('error', userCallbacks, defaultErrCallback),
        serverDiscovery: ndt7_cb('serverDiscovery', userCallbacks),
        serverChosen: ndt7_cb('serverChosen', userCallbacks),
    };
    let protocol = 'wss';
    if (config && ('protocol' in config)) {
        protocol = config.protocol;
    }

    if (config && ('server' in config)) {
        return {
            '///ndt/v7/download': protocol + '://' + config.server + '/ndt/v7/download',
            '///ndt/v7/upload': protocol + '://' + config.server + '/ndt/v7/upload',
        };
    }

    const lbURL = (config && ('loadbalancer' in config)) ? config.loadbalancer : new URL('https://locate.measurementlab.net/v2/nearest/ndt/ndt7');
    callbacks.serverDiscovery({ loadbalancer: lbURL });
    const response = await fetch(lbURL);
    const js = await response.json();
    if (!('results' in js)) {
        callbacks.error(`Could not understand response from ${lbURL}: ${js}`);
        return {};
    }

    // TODO: do not discard unused results. If the first server is unavailable
    // the client should quickly try the next server.
    //
    // Choose the first result sent by the load balancer. This ensures that
    // in cases where we have a single pod in a metro, that pod is used to
    // run the measurement. When there are multiple pods in the same metro,
    // they are randomized by the load balancer already.
    const choice = js.results[0];
    callbacks.serverChosen(choice);

    return {
        '///ndt/v7/download': choice.urls[protocol + ':///ndt/v7/download'],
        '///ndt/v7/upload': choice.urls[protocol + ':///ndt/v7/upload'],
    };
}

const runNDT7Test = async (
    config, callbacks, urlPromise, testType) => {
    if (config.userAcceptedDataPolicy !== true &&
        config.mlabDataPolicyInapplicable !== true) {
        callbacks.error('The M-Lab data policy is applicable and the user ' +
            'has not explicitly accepted that data policy.');
        return 1;
    }

    let clientMeasurement;
    // let serverMeasurement;

    const urls = await urlPromise;

    const worker = new Worker(testType === 'download' ? download_worker_script
        : upload_worker_script);

    const workerPromise = new Promise((resolve) => {
        worker.resolve = (returnCode) => {
            callbacks.complete({
                LastClientMeasurement: clientMeasurement,
                // LastServerMeasurement: serverMeasurement,
            });
            worker.terminate();
            resolve(returnCode);
        };
    });

    // If the worker takes 10 seconds, kill it and return an error code.
    // Most clients take longer than 10 seconds to complete the upload and
    // finish sending the buffer's content, sometimes hitting the socket's
    // timeout of 15 seconds. This makes sure uploads terminate on time.
    setTimeout(() => worker.resolve(0), 10000);

    // This is how the worker communicates back to the main thread of
    // execution.  The MsgTpe of `ev` determines which callback the message
    // gets forwarded to.
    worker.onmessage = (ev) => {
        if (!ev.data || !ev.data.MsgType || ev.data.MsgType === 'error') {
            worker.resolve(3);
            const msg = (!ev.data) ? `${testType} error` : ev.data.Error;
            callbacks.error(msg);
        } else if (ev.data.MsgType === 'start') {
            callbacks.start(ev.data.Data);
        } else if (ev.data.MsgType === 'measurement') {
            // For performance reasons, we parse the JSON outside of the thread
            // doing the downloading or uploading.
            // if (ev.data.Source === 'server') {
            //     serverMeasurement = JSON.parse(ev.data.ServerMessage);
            //     callbacks.measurement({
            //         Source: ev.data.Source,
            //         Data: serverMeasurement,
            //     });
            // } else {
            clientMeasurement = ev.data.MeanClientMbps;
            callbacks.measurement({
                // Source: ev.data.Source,
                Data: ev.data.MeanClientMbps,
            });
            // }
        } else if (ev.data.MsgType === 'complete') {
            worker.resolve(0);
        }
    };

    // We can't start the worker until we know the right server, so we wait
    // here to find that out.
    // Start the worker.
    worker.postMessage(urls);
    // Await the resolution of the workerPromise.
    return await workerPromise;
};

export const downloadTest = async (config, userCallbacks, urlPromise) => {
    const callbacks = {
        error: ndt7_cb('error', userCallbacks, defaultErrCallback),
        start: ndt7_cb('downloadStart', userCallbacks),
        measurement: ndt7_cb('downloadMeasurement', userCallbacks),
        complete: ndt7_cb('downloadComplete', userCallbacks),
    };
    return await runNDT7Test(
        config, callbacks, urlPromise, 'download');
}

const uploadTest = async (config, userCallbacks, urlPromise) => {
    const callbacks = {
        error: ndt7_cb('error', userCallbacks, defaultErrCallback),
        start: ndt7_cb('uploadStart', userCallbacks),
        measurement: ndt7_cb('uploadMeasurement', userCallbacks),
        complete: ndt7_cb('uploadComplete', userCallbacks),
    };
    const rv = await runNDT7Test(
        config, callbacks, urlPromise, 'upload');
    return rv << 4;
}

export const test = async (config, userCallbacks) => {
    // Starts the asynchronous process of server discovery, allowing other
    // stuff to proceed in the background.
    const urlPromise = discoverServerURLs(config, userCallbacks);
    const downloadSuccess = await downloadTest(
        config, userCallbacks, urlPromise);
    const uploadSuccess = await uploadTest(
        config, userCallbacks, urlPromise);
    return downloadSuccess + uploadSuccess;
}