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
    graph: '@',
    interval: 1000,
};

const args = process.argv.slice(2);

// parseArgs
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
            case '--interval':
                options.interval = parseInt(value, 10);
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
    --debug          Enable debug mode (default: false)
    --maxPeers       Set maximum number of ip addresses displayed (default: 10)
    --seconds        Set seconds displayed on graph (default: 30)
    --size           Set size of unitconversion (default: 1000)
    --rxGraph        Set recieve graph icon (default: @)
    --txGraph        Set transfer graph icon (default: #)
    --graph          Set combined graph icon (default: @)
    --interval       Set interval between logging (CURRENTLY BROKEN) (default: 1000)
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

function sumArray(array) {
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
        sum += array[i];
    }
    return sum;
}


function drawGraph(rxHis, txHis) {
    const yHeight = 12;
    const xLength = options.seconds;
    rxHis = rxHis.slice(-xLength);
    txHis = txHis.slice(-xLength);

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
    return maxRx > maxTx ? maxRx - ((maxRx / yHeight) * (i + 1)) : maxTx - ((maxTx / yHeight) * (i + 1));
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
	    
        let currentLine = format(lineValueRx) + " | ";
        for (let j = 0; j < xLength; j++) {
            currentLine += graphArray[i][j];
        }
        console.log(currentLine);
    }
}


async function mainLoop() {
    const networkStats = await sysinfo.networkStats();
    const networkInterface = networkStats[0];
    const {
        iface,
        rx_bytes,
        tx_bytes,
        rx_sec,
        tx_sec,
    } = networkInterface;

    rxHistory.push(rx_sec || 0);
    txHistory.push(tx_sec || 0);

    const rxAverage = sumArray(rxHistory)/rxHistory.length;
    const txAverage = sumArray(txHistory)/txHistory.length;
	
    const rxMin = Math.min(...rxHistory);
    const rxMax = Math.max(...rxHistory);
    const txMin = Math.min(...txHistory);
    const txMax = Math.max(...txHistory)

    console.clear();
    console.log(`Interface: ${iface}`);
    console.log(`Received:			Transferred: `);
    console.log(`  Total: ${format(rx_bytes)}		  ${format(tx_bytes)}`);
    console.log(`  Running: ${format(sumArray(rxHistory))}		  ${format(sumArray(txHistory))}`);
    console.log(`  Current: ${format(rx_sec || 0)}/s		  ${format(tx_sec || 0)}/s`);
    console.log(`  Average: ${format(rxAverage)}/s		  ${format(txAverage)}/s`);
    console.log(`  Min: ${format(rxMin)}/s			  ${format(txMin)}/s`);
    console.log(`  Max: ${format(rxMax)}/s		  ${format(txMax)}/s`);
    drawGraph(rxHistory, txHistory);


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

    const sortedConnections = [...uniqueConnections.values()].sort((a, b) => (b.tx_sec + b.rx_sec) - (a.tx_sec + a.rx_sec)).slice(0, options.maxPeers);

    sortedConnections.forEach(connection => {
    const {
        peerAddress,
        tx_sec,
        rx_sec,
        pid,
    } = connection;

    console.log(`Connected IP: ${peerAddress} - Transferred: ${format(tx_sec || 0)}/s Received: ${format(rx_sec || 0)}/s - PID: ${pid || 0}`);
    });
	
		
    if (options.debug) {console.log('DEBUG TESTING');}
    if (options.debug) {console.log(rxHistory);}
    if (options.debug) {console.log(txHistory);}
    if (options.debug) {console.log(networkInterface);}
    if (options.debug) {console.log(peerStats);}
    if (options.debug) {date = new Date(); console.log(date.getMilliseconds());}
}


rxHistory = [];
txHistory = [];
const main = () => {
    setInterval(mainLoop, options.interval);
};

parseArgs();
main();
