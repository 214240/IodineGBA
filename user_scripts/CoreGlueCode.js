"use strict";
/*
 Copyright (C) 2012-2017 Grant Galitz

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var IodineGUI = {
    Iodine:null,
    Blitter:null,
    coreTimerID:null,
    GUITimerID: null,
    toMap:null,
    toMapIndice:0,
    suspended:false,
    isPlaying:false,
    startTime:(+(new Date()).getTime()),
    mixerInput:null,
    currentSpeed:[false,0],
    defaults:{
        timerRate:16,
        sound:true,
        volume:1,
        skipBoot:false,
        toggleSmoothScaling:true,
        toggleDynamicSpeed:false,
        toggleOffthreadGraphics:true,
        toggleOffthreadCPU:(navigator.userAgent.indexOf('AppleWebKit') == -1 || (navigator.userAgent.indexOf('Windows NT 10.0') != -1 && navigator.userAgent.indexOf('Trident') == -1)),
        keyZonesGBA:[
            //Use this to control the GBA key mapping:
            //A:
            106,
            //B:
            107,
            //Select:
            16,
            //Start:
            13,
            //Right:
            108,
            //Left:
            59,
            //Up:
            119,
            //Down:
            115,
            //R:
            83,
            //L:
            65
        ],
        keyZonesControl:[
            //Use this to control the emulator function key mapping:
            //Volume Down:
            55,
            //Volume Up:
            56,
            //Speed Up:
            52,
            //Slow Down:
            51,
            //Reset Speed:
            53,
            //Toggle Fullscreen:
            54,
            //Play/Pause:
            80,
            //Restart:
            82
        ]
    }
};
window.onload = function () {
    //Populate settings:
    registerDefaultSettings();
    //Initialize Iodine:
    registerIodineHandler();
    //Initialize the timer:
    registerTimerHandler();
    //Initialize the graphics:
    registerBlitterHandler();
    //Initialize the audio:
    registerAudioHandler();
    //Register the save handler callbacks:
    registerSaveHandlers();
    //Register the GUI controls.
    registerGUIEvents();
    //Register GUI settings.
    registerGUISettings();
}
function registerIodineHandler() {
    try {
        /*
        We utilize SharedArrayBuffer and Atomics API,
        which browsers prior to 2016 do not support:
        */
        if (typeof SharedArrayBuffer != "function" || typeof Atomics != "object") {
            throw null;
        }
        else if (!IodineGUI.defaults.toggleOffthreadCPU) {
            //Try starting Iodine normally, but initialize offthread gfx:
            IodineGUI.Iodine = new IodineGBAWorkerGfxShim();
        }
        else {
            //Try starting Iodine in a webworker:
            IodineGUI.Iodine = new IodineGBAWorkerShim();
            //In order for save on page unload, this needs to be done:
            addEvent("beforeunload", window, registerBeforeUnloadHandler);
        }
    }
    catch (e) {
        //Otherwise just run on-thread:
        IodineGUI.Iodine = new GameBoyAdvanceEmulator();
    }
}
function registerBeforeUnloadHandler(e) {
    IodineGUI.Iodine.pause();
    if (e.preventDefault) {
        e.preventDefault();
    }
    return "IodineGBA needs to process your save data, leaving now may result in not saving current data.";
}
function registerTimerHandler() {
    IodineGUI.defaults.timerRate = 16;
    IodineGUI.Iodine.setIntervalRate(IodineGUI.defaults.timerRate | 0);
}
function initTimer() {
    IodineGUI.coreTimerID = setInterval(function () {
        IodineGUI.Iodine.timerCallback(((+(new Date()).getTime()) - (+IodineGUI.startTime)) >>> 0);
    }, IodineGUI.defaults.timerRate | 0);
}
function registerBlitterHandler() {
    IodineGUI.Blitter = new GfxGlueCode(240, 160);
    IodineGUI.Blitter.attachCanvas(document.getElementById("emulator_target"));
    IodineGUI.Iodine.attachGraphicsFrameHandler(IodineGUI.Blitter);
    IodineGUI.Blitter.attachGfxPostCallback(function () {
        if (IodineGUI.currentSpeed[0]) {
            var speedDOM = document.getElementById("speed");
            speedDOM.textContent = "Speed: " + IodineGUI.currentSpeed[1] + "%";
        }
    });
}
function registerAudioHandler() {
    var Mixer = new GlueCodeMixer();
    IodineGUI.mixerInput = new GlueCodeMixerInput(Mixer);
    IodineGUI.Iodine.attachAudioHandler(IodineGUI.mixerInput);
}
