'use strict';

var Accessory, Service, Characteristic, UUIDGen, api;

module.exports = function(homebridge) {
    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    api = homebridge;

    homebridge.registerAccessory('homebridge-http-smart-switch', 'http-smart-switch', SmartSwitch);
};

class SmartSwitch {
    constructor(log, config) {
        this.services = [];
        this.log = log;
        this.name = config.name;
        this.notificationId = config.notificationId;
        this.singlePress = config['single-press'];
        this.longPress = config['long-press'] || false;
        this.doublePress = config['double-press'] || false;

        if (!this.singlePress && !this.longPress && !this.doublePress) {
            throw new Error('At least a single press must be enabled');
        }

        if (!this.notificationId) {
            throw new Error('Identifier for http-notification-server must be configured');
        }

        // HOMEKIT SERVICES
        this.serviceInfo = new Service.AccessoryInformation();
        this.serviceInfo
            .setCharacteristic(Characteristic.Manufacturer, 'Nomadic Works')
            .setCharacteristic(Characteristic.Model, 'Smart Switch');
        this.services.push(this.serviceInfo);

        this.switchService = new Service.StatelessProgrammableSwitch(this.name, 'switch');
        const validValues = [];
        if (this.singlePress) {
            validValues.push(0);
        }

        if (this.doublePress) {
            validValues.push(1);
        }

        if (this.longPress) {
            validValues.push(2);
        }

        this.switchService.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps({
            minValue: 0, maxValue: 2, validValues: validValues,
        });

        this.services.push(this.switchService);

        api.on('didFinishLaunching', () => {
            if (api.notificationRegistration && typeof api.notificationRegistration === 'function') {
                try {
                    api.notificationRegistration(this.notificationId, this.handleNotification.bind(this));
                } catch (error) {
                    // notificationID is already taken
                }
            }
        });
    }

    getServices () {
        return this.services;
    }

    handleNotification(request) {
        const characteristic = request.characteristic;


        const value = request.value;

        const validCharacteristic = this.switchService.testCharacteristic(characteristic);
        if (!validCharacteristic) {
            this.log("Encountered unknown characteristic when handling notification: " + characteristic);
            return;
        }

        this.switchService.updateCharacteristic(Characteristic.ProgrammableSwitchEvent, value);
    }
}
