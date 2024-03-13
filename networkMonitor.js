#!/usr/bin/env node
const sysinfo = require('systeminformation');

// Default options
const options = {
    debug: false,
    maxPeers: 10,
    seconds: 30,
    size: 1000,
    rxGraph: '@',
    txGraph: '#',
    graph: '*',
    interface: 0,
};

const args = process.argv.slice(2);


function parseArgs() {
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const [key, value] = arg.split('=');

        switch (key) {
            case '--debug':
                options.debug = value;
                break;
            case '--maxPeers':
                options.maxPeers = parseInt(value, 10);
                break;
            case '--seconds':
                options.seconds = parseInt(value, 10);
                break;
            case '--size':
                options.size = parseInt(value, 10);
                break;
            case '--rxGraph':
                options.rxGraph = value;
                break;
            case '--txGraph':
                options.txGraph = value;
                break;
            case '--graph':
                options.graph = value;
                break;
	        case '--interface':
		        options.interface = parseInt(value, 10);
		        break;
            default:
                console.log(`Unknown option: ${arg}`);
                printUsage();
                process.exit(1); 
        }
    }
}
  

function printUsage() {
    console.log(`
    Usage: node app.js [options]

    Options:
    --debug          Enable debug mode (default: ${options.debug})
    --maxPeers       Set maximum number of ip addresses displayed (default: ${options.maxPeers})
    --seconds        Set seconds displayed on graph (default: ${options.seconds})
    --size           Set size of unitconversion (default: ${options.size})
    --rxGraph        Set recieve graph icon (default: ${options.rxGraph})
    --txGraph        Set transfer graph icon (default: ${options.txGraph})
    --graph          Set combined graph icon (default: ${options.graph})
    --interface      Set NetworkInterface monitored (default: ${options.interface})
    `);
} 
  

function format(bytes) {
    const decimals = 2;
    if (bytes === 0) return '0 B';
    const size = options.size; 
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const dm = decimals < 0 ? 0 : decimals;

    const i = Math.floor(Math.log(bytes) / Math.log(size));
    return parseFloat((bytes / Math.pow(size, i)).toFixed(dm)) + ' ' + sizes[i];
}


function drawGraph(rxHis, txHis) {
    const yHeight = 12;
    const xLength = options.seconds;

    const graphArray = initializeGraphArray(yHeight, xLength);
    fillGraphArray(graphArray, rxHis, txHis);
    displayGraph(graphArray, yHeight, xLength);
    console.log(` '${options.rxGraph}' Received, '${options.txGraph}' Transferred, '${options.graph}' Both`);
}

function initializeGraphArray(yHeight, xLength) {
    const graphArray = [];
    for (let i = 0; i < yHeight; i++) {
        graphArray[i] = [];
        for (let j = 0; j < xLength; j++) {
            graphArray[i][j] = " ";
        }
    }
    return graphArray;
}

function fillGraphArray(graphArray, rxHis, txHis) {
    const yHeight = graphArray.length;
    for (let i = 0; i < yHeight; i++) {
        const lineValue = calculateLineValue(i, yHeight, Math.max(...rxHis), Math.max(...txHis));
        for (let j = 0; j < graphArray[0].length; j++) {
            updateGraphArrayElement(graphArray, rxHis, txHis, i, j, lineValue);
        }
    }
}

function calculateLineValue(i, yHeight, maxRx, maxTx) {
    const yMaxRx = maxRx * yHeight / 10;
    const yMaxTx = maxTx * yHeight / 10;
    yMax = yMaxRx > yMaxTx ? yMaxRx : yMaxTx;
    if (i + 1 == yHeight) {return 0;}
    return yMax - ((yMax / yHeight) * (i + 1));
}

function updateGraphArrayElement(graphArray, rxHis, txHis, i, j, lineValue) {
    if (rxHis[j] >= lineValue && txHis[j] < lineValue) {
        graphArray[i][j] = options.rxGraph;
    } else if (txHis[j] >= lineValue && rxHis[j] < lineValue) {
        graphArray[i][j] = options.txGraph;
    } else if (rxHis[j] >= lineValue && txHis[j] >= lineValue) {
        graphArray[i][j] = options.graph;
    }
}

function displayGraph(graphArray, yHeight, xLength) {
    for (let i = 0; i < yHeight; i++) {
        const lineValueRx = calculateLineValue(i, yHeight, Math.max(...rxHistory), Math.max(...txHistory));
        let currentLine = addPadding(format(lineValueRx), 10) + " | ";
        for (let j = 0; j < xLength; j++) {
            currentLine += graphArray[i][j];
        }
        console.log(currentLine);
    }
}

function addPadding(inputString, lengthGoal) {
    const length = inputString.length;

    for (let k = length; k < lengthGoal; k++) {
        inputString += " ";
    }
    return inputString;
}


async function networkStats() {
    const networkStats = await sysinfo.networkStats();
    const networkInterface = networkStats[options.interface];
    return networkInterface;
}

async function connections() {
    const peerStats = await sysinfo.networkConnections();

    const nonLocalConnections = peerStats.filter(connection => 
        !connection.peerAddress.startsWith('127.') && 
        !connection.peerAddress.startsWith('192.168.') && 
        !connection.peerAddress.startsWith('10.') && 
        !connection.peerAddress.startsWith('0.0.0.0') && 
        !connection.peerAddress.startsWith(':')
    );	

    const uniqueConnections = new Map();
    nonLocalConnections.forEach(connection => {
        const {
            peerAddress,
            tx_sec,
            rx_sec,
            pid,
        } = connection;

        const key = `${peerAddress}-${tx_sec || 0}-${rx_sec || 0}`;
        if (!uniqueConnections.has(key)) {
            uniqueConnections.set(key, {
                peerAddress,
                tx_sec,
                rx_sec,
                pid,
            });
        }
    });

    return [...uniqueConnections.values()].sort((a, b) => (b.tx_sec + b.rx_sec) - (a.tx_sec + a.rx_sec)).slice(0, options.maxPeers);
}

function minMax(txCurrent, rxCurrent) {
    if (txCurrent > txMax) {
        txMax = txCurrent;
    } else if (txCurrent < txMin) {
        txMin = txCurrent;
    }
    if (rxCurrent > rxMax) {
        rxMax = rxCurrent;
    } else if (txCurrent < rxMin) {
        rxMax = rxCurrent;
    }
    txMin = txMin == undefined ? txCurrent : txMin;
    rxMin = rxMin == undefined ? rxCurrent : rxMin;
    return;
}

async function mainLoop() {
    runtime++;
    const networkInterface = await networkStats();
    const {
        iface,
        rx_bytes,
        tx_bytes,
        rx_sec,
        tx_sec,
    } = networkInterface;

    const sortedConnections = await connections();
    sortedConnections.forEach(connection => {
        const {
            peerAddress,
            tx_sec,
            rx_sec,
            pid,
        } = connection;

    rxHistory.push(rx_sec || 0);
    txHistory.push(tx_sec || 0);
    rxHistory = rxHistory.slice(-options.seconds);
    txHistory = txHistory.slice(-options.seconds);

    rxSum += rx_sec;
    txSum += tx_sec;
    const rxAverage = rxSum/runtime;
    const txAverage = txSum/runtime;
	minMax(tx_sec, rx_sec);


    console.clear();
    console.log(`Interface: ${iface}`);
    console.log(addPadding(`Received:`, 32) + `Transferred: `);
    console.log(addPadding(`  Total: ${format(rx_bytes)}`, 34) + `${format(tx_bytes)}`);
    console.log(addPadding(`  Running: ${format(rxSum)}`, 34) + `${format(txSum)}`);
    console.log(addPadding(`  Current: ${format(rx_sec || 0)}/s`, 34) + `${format(tx_sec || 0)}/s`);
    console.log(addPadding(`  Average: ${format(rxAverage)}/s`, 34) + `${format(txAverage)}/s`);
    console.log(addPadding(`  Min: ${format(rxMin)}/s`, 34) + `${format(txMin)}/s`);
    console.log(addPadding(`  Max: ${format(rxMax)}/s`, 34) + `${format(txMax)}/s`);
    drawGraph(rxHistory, txHistory);

    

        console.log(`Connected IP: ${peerAddress} - Transferred: ${format(tx_sec || 0)}/s Received: ${format(rx_sec || 0)}/s - PID: ${pid || 0}`);
    });
			
    if (options.debug) {debug(rxHistory, txHistory, networkInterface);}
}


function debug(rx, tx, nI) {
    console.log('DEBUG');
    console.log(rx);
    console.log(tx);
    console.log(nI);
    date = new Date();
    console.log(date.getMilliseconds());
}


rxHistory = [];
rxSum = 0;
rxMin = undefined;
rxMax = 0;
txHistory = [];
txSum = 0;
txMin = undefined;
txMax = 0;
runtime = 0;
const main = () => {
    setInterval(mainLoop, 1000);
};

parseArgs();
main();
