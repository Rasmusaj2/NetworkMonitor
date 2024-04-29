## Network Monitor

This is a simple network monitoring tool to track the connections going through the device and display real-time graphs of network activity. This tool provides insights into network utilization, including data transfer rates, average rates, and connected ips.

### Installation:

Make sure you have Node.js installed on your system. clone this repository and install dependencies using npm:

```bash
git clone https://github.com/rasmusaj2/NetworkMonitor.git
cd repository
npm install
```

### Usage:

Run the network monitor tool with optional command-line arguments to customize its behavior:

```bash
node networkMonitor.js [options]
```

#### Options:

- `--debug`: Enable debug mode (default: false)
- `--maxPeers`: Set maximum number of IP addresses displayed (default: 10)
- `--seconds`: Set seconds displayed on graph (default: 30)
- `--size`: Set size of unit conversion (default: 1000)
- `--rxGraph`: Set receive graph icon (default: '@')
- `--txGraph`: Set transfer graph icon (default: '#')
- `--graph`: Set combined graph icon (default: '*')
- `--interface`: Set Network Interface monitored (default: 0)
- `--ipv6`: Set if IPv6 connections should be displayed (default: false)

### Example:

```bash
node networkMonitor.js --debug=true --maxPeers=15 --seconds=60
```

### Functionality:

- Displays real-time graphs of network activity.
- Provides detailed network statistics including total, running, current, average, min, and max data transfer rates.
- Lists connected IP addresses along with their transfer and receive rates.

### Dependencies:

- [systeminformation](https://github.com/sebhildebrandt/systeminformation): Used to retrieve system network information.

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
