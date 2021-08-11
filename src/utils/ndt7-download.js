if (typeof WebSocket === 'undefined') {
    global.WebSocket = require('isomorphic-ws');
}

const downloadWorker = () => {
    onmessage = (ev) => {
        const url = ev.data['///ndt/v7/download'];
        const sock = new WebSocket(url, 'net.measurementlab.ndt.v7');
        let now = () => new Date().getTime();
        if (typeof performance !== 'undefined' &&
            typeof performance.now !== 'undefined') {
            now = () => performance.now();
        }
        sock.onclose = () => {
            console.log('completed')
            postMessage({
                MsgType: 'complete',
            });
        };

        sock.onerror = (ev) => {
            postMessage({
                MsgType: 'error',
                Error: ev,
            });
        };

        let start = now();
        let previous = start;
        let total = 0;

        sock.onopen = () => {
            start = now();
            previous = start;
            total = 0;
            postMessage({
                MsgType: 'start',
                Data: {
                    ClientStartTime: start,
                },
            });
        };

        sock.onmessage = (ev) => {
            total +=
                (typeof ev.data.size !== 'undefined') ? ev.data.size : ev.data.length;
            // Perform a client-side measurement 4 times per second.
            const t = now();
            const every = 250; // ms
            if (t - previous > every) {
                postMessage({
                    MsgType: 'measurement',
                    // ClientData: {
                    //     ElapsedTime: (t - start) / 1000, // seconds
                    //     NumBytes: total,
                    //     // MeanClientMbps is calculated via the logic:
                    //     //  (bytes) * (bits / byte) * (megabits / bit) = Megabits
                    //     //  (Megabits) * (1/milliseconds) * (milliseconds / second) = Mbps
                    //     // Collect the conversion constants, we find it is 8*1000/1000000
                    //     // When we simplify we get: 8*1000/1000000 = .008
                    //     MeanClientMbps: (total / (t - start)) * 0.008,
                    // },
                    MeanClientMbps: (total / (t - start)) * 0.008,
                    Source: 'client',
                });
                previous = t;
            }

            // Pass along every server-side measurement.
            // if (typeof ev.data === 'string') {
            //     postMessage({
            //         MsgType: 'measurement',
            //         ServerMessage: ev.data,
            //         Source: 'server',
            //     });
            // }
        };
    }
};

let code = downloadWorker.toString();
code = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}"));

const blob = new Blob([code], { type: "application/javascript" });
const download_worker_script = URL.createObjectURL(blob);

module.exports = download_worker_script;