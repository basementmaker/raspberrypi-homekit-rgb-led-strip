const gpio = require('pigpio').Gpio;
const hap = require("hap-nodejs");

const Accessory = hap.Accessory;
const Characteristic = hap.Characteristic;
const CharacteristicEventTypes = hap.CharacteristicEventTypes;
const Service = hap.Service;

const accessoryUuid = hap.uuid.generate("basementmaker.projects.rgbledstrip");
const accessory = new Accessory("RGB LED Strip Accesssory", accessoryUuid);

const lightService = new Service.Lightbulb("RGB LED Strip");

const onCharacteristic = lightService.getCharacteristic(Characteristic.On);
const brightnessCharacteristic = lightService.getCharacteristic(Characteristic.Brightness);
const hueCharacteristic = lightService.getCharacteristic(Characteristic.Hue);
const saturationCharacteristic = lightService.getCharacteristic(Characteristic.Saturation);

var showLogging = false;
var LEDstripStatusIsOn = false;
var currentLEDbrightness = 0;
var hue = 0;
var saturation = 0;
var redLED = new gpio(17, {mode: gpio.OUTPUT});
var greenLED = new gpio(22, {mode: gpio.OUTPUT});
var blueLED = new gpio(24, {mode: gpio.OUTPUT});

redLED.pwmWrite(0);
greenLED.pwmWrite(0);
blueLED.pwmWrite(0);

var redValue = 0;
var greenValue = 0;
var blueValue = 0;

var brightnessChanged = false;
var hueChanged = false;
var saturationChanged = false;

const changeColor = function () {
  if ( (hueChanged && saturationChanged) || brightnessChanged ) {
    if (showLogging) { console.log("changing color ..."); }
    var h, s, v;
    var r, g, b;

    h = hue/360;
    s = saturation/100;
    v = currentLEDbrightness/100;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }

    r = Math.floor(r * 255);
    g = Math.floor(g * 255);
    b = Math.floor(b * 255);

    if ( r < 25 ) { r = 0 } // helper for poor performing rgb leds, they are too bright at low values. comment out line if needed
    if ( g < 25 ) { g = 0 } // same as ^
    if ( b < 25 ) { b = 0 } // same as ^

    redValue = r;
    greenValue = g;
    blueValue = b;

    if (showLogging) { console.log("Red: "+r); }
    if (showLogging) { console.log("Green: "+g); }
    if (showLogging) { console.log("Blue: "+b); }

    redLED.pwmWrite(r);
    greenLED.pwmWrite(g);
    blueLED.pwmWrite(b);

    brightnessChanged = false;
    hueChanged = false;
    saturationChanged = false;
  }
}

onCharacteristic.on(CharacteristicEventTypes.GET, callback => {
  if (showLogging) { console.log("Is RGB LED Strip On?: " + LEDstripStatusIsOn); }
  callback(undefined, LEDstripStatusIsOn);
});

onCharacteristic.on(CharacteristicEventTypes.SET, (value, callback) => {
  if (showLogging) { console.log("Setting RGB LED Strip On: " + value); }
  if ( value == true && LEDstripStatusIsOn == false) {
    if ( currentLEDbrightness == 0 ) {
      currentLEDbrightness = 100;
      hue = 251;
      saturation = 5;
      brightnessChanged = true;
      hueChanged = true;
      saturationChanged = true;
      changeColor();
    } else {
      redLED.pwmWrite(redValue);
      greenLED.pwmWrite(greenValue);
      blueLED.pwmWrite(blueValue);
    }
  } else if ( value == false ) {
    redLED.pwmWrite(0);
    greenLED.pwmWrite(0);
    blueLED.pwmWrite(0);
  } else {
    // do nothing
  }
  LEDstripStatusIsOn = value;
  callback();
});

brightnessCharacteristic.on(CharacteristicEventTypes.GET, (callback) => {
  if (showLogging) { console.log("Current Strip brightness level?: " + currentLEDbrightness); }
  callback(undefined, currentLEDbrightness);
});

brightnessCharacteristic.on(CharacteristicEventTypes.SET, (value, callback) => {
  if (showLogging) { console.log("Setting Strip brightness level to: " + value); }
  var val = parseInt(255*(value/100), 10);
  currentLEDbrightness = Math.ceil((val/255)*100);
  brightnessChanged = true;
	changeColor();
  callback();
});

hueCharacteristic.on(CharacteristicEventTypes.GET, (callback) => {
  if (showLogging) { console.log("Current Hue level?: " + hue); }
  callback(undefined, currentLEDbrightness);
});

hueCharacteristic.on(CharacteristicEventTypes.SET, (value, callback) => {
  if (showLogging) { console.log("Setting Hue to: " + value); }
  hue = value;
	hueChanged = true;
	changeColor();
  callback();
});

saturationCharacteristic.on(CharacteristicEventTypes.GET, (callback) => {
  if (showLogging) { console.log("Current Saturation?: " + saturation); }
  callback(undefined, currentLEDbrightness);
});

saturationCharacteristic.on(CharacteristicEventTypes.SET, (value, callback) => {
  if (showLogging) { console.log("Setting Saturation to: " + value); }
  saturation = value;
  saturationChanged = true;
  changeColor();
  callback();
});

accessory.addService(lightService);

accessory.publish({
  username: "BB:00:00:00:00:02",
  pincode: "000-00-123",
  port: 47129,
  category: hap.Categories.LIGHTBULB
});

if (showLogging) { console.log("Accessory setup finished!"); }
