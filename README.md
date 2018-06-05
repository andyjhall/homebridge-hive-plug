# homebridge-hive-plug
This [HomeBridge](https://github.com/nfarina/homebridge) Plugin adds support for the Hive Smart Plugs. 

## Installation

### 1. Install HomeBridge

Details on the installation process can be found here [HomeBridge](https://github.com/nfarina/homebridge).

### 2. Installing this Plugin

Run this command to download homebridge-hive-plug

```
npm install -g homebridge-hive-plug
```

### 3. Configure HomeBridge

In your `config.json` file, add this accessory providing the username and password you use to log into https://my.hivehome.com.

The name of the accessory must **MATCH** the name of the smart plug that you have set up with the hive kit or it will not connect.

```
    "accessories": [
        {
            "accessory": "HivePlug",
            "name": "SmartPlug",
            "displayName: "Bedroom 1",
            "username": "you@example.com",
            "password": "123456789"
        }
    ],
```

Then restart homebridge, you should be all up and running.