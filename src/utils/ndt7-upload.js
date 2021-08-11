if (typeof WebSocket === 'undefined') {
    global.WebSocket = require('isomorphic-ws');
}

const uploadWorker = () => {
    onmessage = (ev) => {
        const url = ev.data['///ndt/v7/upload'];
        const sock = new WebSocket(url, 'net.measurementlab.ndt.v7');
        let now = () => new Date().getTime();
        if (typeof performance !== 'undefined' &&
            typeof performance.now !== 'undefined') {
            now = () => performance.now();
        }
        uploadTest(sock, postMessage, now);
    }
    const uploadTest = (sock, postMessage, now) => {
        let closed = false;
        sock.onclose = () => {
            if (!closed) {
                closed = true;
                postMessage({
                    MsgType: 'complete',
                });
            }
        };

        // sock.onmessage = (ev) => {
        //     if (typeof ev.data !== 'undefined') {
        //         postMessage({
        //             MsgType: 'measurement',
        //             Source: 'server',
        //             ServerMessage: ev.data,
        //         });
        //     }
        // };

        /**
         * uploader is the main loop that uploads data in the web browser. It must
         * carefully balance a bunch of factors:
         *   1) message size determines measurement granularity on the client side,
         *   2) the JS event loop can only fire off so many times per second, and
         *   3) websocket buffer tracking seems inconsistent between browsers.
         *
         * Because of (1), we need to have small messages on slow connections, or
         * else this will not accurately measure slow connections. Because of (2), if
         * we use small messages on fast connections, then we will not fill the link.
         * Because of (3), we can't depend on the websocket buffer to "fill up" in a
         * reasonable amount of time.
         *
         * So on fast connections we need a big message size (one the message has
         * been handed off to the browser, it runs on the browser's fast compiled
         * internals) and on slow connections we need a small message. Because this
         * is used as a speed test, we don't know before the test which strategy we
         * will be using, because we don't know the speed before we test it.
         * Therefore, we use a strategy where we grow the message exponentially over
         * time. In an effort to be kind to the memory allocator, we always double
         * the message size instead of growing it by e.g. 1.3x.
         *
         * @param {*} data
         * @param {*} start
         * @param {*} end
         * @param {*} previous
         * @param {*} total
         */
        const uploader = (data, start, end, previous, total) => {
            if (closed) {
                // socket.send() with too much buffering causes socket.close(). We only
                // observed this behaviour with pre-Chromium Edge.
                return;
            }
            const t = now();
            if (t >= end) {
                sock.close();
                return;
            }

            const maxMessageSize = 8388608; /* = (1<<23) = 8MB */
            const clientMeasurementInterval = 250; // ms

            // Message size is doubled after the first 16 messages, and subsequently
            // every 8, up to maxMessageSize.
            const nextSizeIncrement =
                (data.length >= maxMessageSize) ? Infinity : 16 * data.length;
            if ((total - sock.bufferedAmount) >= nextSizeIncrement) {
                data = new Uint8Array(data.length * 2);
            }

            // We keep 7 messages in the send buffer, so there is always some more
            // data to send. The maximum buffer size is 8 * 8MB - 1 byte ~= 64M.
            const desiredBuffer = 7 * data.length;
            if (sock.bufferedAmount < desiredBuffer) {
                sock.send(data);
                total += data.length;
            }

            if (t >= previous + clientMeasurementInterval) {
                const numBytes = total - sock.bufferedAmount;
                // ms / 1000 = seconds
                const elapsedTime = (t - start) / 1000;
                // bytes * bits/byte * megabits/bit * 1/seconds = Mbps
                const meanMbps = numBytes * 8 / 1000000 / elapsedTime;
                postMessage({
                    MsgType: 'measurement',
                    // ClientData: {
                    //     // ElapsedTime: elapsedTime,
                    //     // NumBytes: numBytes,
                    //     MeanClientMbps: meanMbps,
                    // },
                    MeanClientMbps: meanMbps,
                    Source: 'client',
                    Test: 'upload',
                });
                previous = t;
            }

            // Loop the uploader function in a way that respects the JS event handler.
            setTimeout(() => uploader(data, start, end, previous, total), 0);
        }

        sock.onopen = () => {
            const initialMessageSize = 8192; /* (1<<13) = 8kBytes */
            const data = new Uint8Array(initialMessageSize);
            const start = now(); // ms since epoch
            const duration = 10000; // ms
            const end = start + duration; // ms since epoch

            postMessage({
                MsgType: 'start',
                Data: {
                    StartTime: start / 1000, // seconds since epoch
                    ExpectedEndTime: end / 1000, // seconds since epoch
                },
            });

            // Start the upload loop.
            uploader(data, start, end, start, 0);
        };
    };
};

let code = uploadWorker.toString();
code = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}"));

const blob = new Blob([code], { type: "application/javascript" });
const upload_worker_script = URL.createObjectURL(blob);

module.exports = upload_worker_script;