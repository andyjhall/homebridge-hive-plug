var request = require("request");
var Service, Characteristic;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-hive-plug", "HivePlug", HivePlug);
};

function HivePlug(log, config) {
    this.log = log;
    this.sessionId = null;
    this.baseHive = "https://api-prod.bgchprod.info:443/omnia";
    this.name = config.name;
    this.displayName = config.displayName;
    this.username = config.username;
    this.password = config.password;
    this.debug = Boolean(config.debug) || false;
    this.plug = null;
    this.loginToHive(null);
}

HivePlug.prototype = {

    /**
     * Login to Hive
     * -- Login to the Hive service
     */
    loginToHive: function(callback) {
        var me = this;
        request.post({
            url: this.baseHive + '/auth/sessions',
            headers: {
                'Content-Type': 'application/vnd.alertme.zoo-6.1+json',
                'Accept': 'application/vnd.alertme.zoo-6.1+json',
                'X-Omnia-Client': 'Hive Web Dashboard'
            },
            body: JSON.stringify({
                "sessions": [{
                    "username": this.username,
                    "password": this.password,
                    "caller": "WEB"
                }]
            })
        },
        function(error, response, body) {
            var resp = JSON.parse(body);
            if(resp.errors){
                me.log('You could not login to your hive account.');
            } else {
                me.sessionId = resp.sessions[0].sessionId;
                me.getplug(callback);
            }
        }.bind(this));
    },

    /**
     * Get Light bulb
     * -- Get light bulb
     */
    getplug: function(callback) {
        var me = this;
        request.get({
            url: this.baseHive + '/nodes',
            headers: {
                'Content-Type': 'application/vnd.alertme.zoo-6.1+json',
                'Accept': 'application/vnd.alertme.zoo-6.1+json',
                'X-Omnia-Client': 'Hive Web Dashboard',
                'X-Omnia-Access-Token': this.sessionId,
            },
        },
        function(error, response, body) {
            var resp = JSON.parse(body);
            var id = null;
            if(resp.errors){
                me.log('You could not login to your hive account.');
            } else {
                resp.nodes.forEach(function(node){
					me.log(node.nodeType);
					me.log(me.name);
                    if (node.nodeType === 'http://alertme.com/schema/json/node.class.smartplug.json#'
                        && me.name === node.name){
                        id = node.id;
                    }
                });

                // check to see if an id was found
                if(!id) {
                    me.log('Please ensure the device has been setup correctly.');
                }

                // assign id to globel proto
                me.plug = id;

                // return callback
                return callback;
            }
        }.bind(this));
    },

    /**
     * Base Request
     * -- Used for interacting with the plug
     */
    baseRequest: function(type, body, callback) {
        var me = this;
        if (me.debug) {
            me.log(type, body, callback);
        }
        if(!this.plug) {
            me.log("Please ensure your device is connected to the internet.")
        }
        request[type]({
            url: this.baseHive + '/nodes/' + this.plug,
            headers: {
                'Content-Type': 'application/vnd.alertme.zoo-6.1+json',
                'Accept': 'application/vnd.alertme.zoo-6.1+json',
                'X-Omnia-Client': 'Hive Web Dashboard',
                'X-Omnia-Access-Token': this.sessionId,
            },
            body: JSON.stringify(body),
        },
        function(error, response, body) {
            var responseJSON = JSON.parse(body);
            if ( responseJSON.errors ) {
                return me.loginToHive(function() {
                    if (me.debug) {
                        me.log("Session has expired, retrieving new session id");
                    }
                    me.baseRequest(type, body, callback);
                });
            }
            return callback(responseJSON);
        }.bind(this));
    },

    /**
     *  Get Light Bulb Status
     *  -- Checks to see if plug is on or off.
     */
    getplugOnCharacteristic: function(next) {
        var me = this;
        if (me.debug) {
            me.log("[START] - Checking plug");
        }
        this.baseRequest('get', null, function(response) {
            var me = this;
            if (me.debug) {
                me.log("[COMPLETED] - Checking plug status has completed");
            }
            return next(null, response.nodes[0].attributes.state.reportedValue === 'ON' ? true : false);
        });
    },


    /**
     * Set plug Status
     * -- Sets the plug to on or off
     */
    setplugOnCharacteristic: function(on, next) {
        var me = this;
        if (me.debug) {
            me.log("[START] - Setting plug");
        }
        this.baseRequest('put', {
            nodes:[
                {
                attributes: {
                        state: {
                            targetValue: on === true ? 'ON' : 'OFF'
                        }
                    }
                }
            ]
        }, function(response) {
            if (me.debug) {
                me.log("[COMPLETED] - Setting plug");
            }
            return next();
        });
    },

    /**
     * Sets Service Information
     */
    getServices: function () {
        var informationService = new Service.AccessoryInformation();
        var plugService = new Service.Switch(this.displayName);

        // info
        informationService
            .setCharacteristic(Characteristic.Manufacturer, "British Gas")
            .setCharacteristic(Characteristic.Model, "Hive Plug")
            .setCharacteristic(Characteristic.SerialNumber, "N/A");

        // on
        plugService
            .getCharacteristic(Characteristic.On)
            .on('get', this.getplugOnCharacteristic.bind(this))
            .on('set', this.setplugOnCharacteristic.bind(this));

        this.informationService = informationService;
        this.plugService = plugService;

        return [informationService, plugService];
    }
};
